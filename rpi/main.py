import os
import warnings

os.environ["OPENCV_LOG_LEVEL"] = "FATAL"
os.environ["QT_LOGGING_RULES"] = "*.debug=false;qt.qpa.*=false"
warnings.filterwarnings("ignore", module="gpiozero")

import cv2
import time
import requests
import base64
import threading
import numpy as np
from gpiozero import AngularServo, Device
from collections import deque
import re

# ==============================================================================
# CONFIGURATION
# ==============================================================================
import os

def load_env():
    env_dict = {}
    try:
        env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
        with open(env_path) as f:
            for line in f:
                if line.strip() and not line.startswith("#"):
                    key, val = line.strip().split("=", 1)
                    env_dict[key.strip()] = val.strip().strip("'\"")
    except FileNotFoundError:
        print("Warning: .env file not found. Using default configs.")
    return env_dict

env_vars = load_env()
API_BASE = env_vars.get("API_BASE", "http://localhost:5173/api/gate")
API_KEY = env_vars.get("API_KEY", "replace-with-a-secure-random-gate-key")

# ------------------------------------------------------------------------------
# GPIO pin factory setup (Raspberry Pi OS "Trixie" / Python 3.13 / Pi 4)
# ------------------------------------------------------------------------------
# On Trixie:
#   * pigpio has been dropped from the apt repos entirely (it can't run on a
#     Pi 5, so it was pulled for every board), so gpiozero's automatic
#     fallback to pigpio will always fail here.
#   * the `lgpio` PyPI wheel isn't built for Python 3.13 yet, so
#     `pip install lgpio` tries to compile it from source, which needs swig
#     -- and even after installing swig, the build can still fail.
#
# The reliable fix is to skip pip for the GPIO libraries altogether and use
# the versions Raspberry Pi OS Trixie already ships via apt (precompiled for
# Python 3.13 / aarch64), then point gpiozero directly at lgpio instead of
# letting it probe every backend in turn.
#
# One-time setup on the Pi (run once, outside any venv):
#   sudo apt update
#   sudo apt install python3-lgpio python3-gpiozero
#
# If this script runs inside a virtualenv, it needs to be created (or
# recreated) with access to those system packages:
#   python3 -m venv --system-site-packages venv
#   source venv/bin/activate
#   pip install opencv-python requests pyzbar   # everything EXCEPT gpio libs
#
# Do not pip install lgpio or pigpio -- that's what triggers the swig build.

try:
    from gpiozero.pins.lgpio import LGPIOFactory
    Device.pin_factory = LGPIOFactory()
except Exception as e:
    print(
        "Warning: could not load the lgpio pin factory (mock mode).\n"
        "  Fix: sudo apt install python3-lgpio python3-gpiozero\n"
        "  If you're in a venv, recreate it with --system-site-packages so "
        "it can see those apt-installed packages.\n"
        f"  Underlying error: {e}"
    )

MIN_PW = 0.0005
MAX_PW = 0.0025

try:
    servo_in = AngularServo(13, min_pulse_width=MIN_PW, max_pulse_width=MAX_PW, initial_angle=None)
    servo_out = AngularServo(19, min_pulse_width=MIN_PW, max_pulse_width=MAX_PW, initial_angle=None)
except Exception as e:
    print("Warning: GPIO not available (mock mode).", e)
    class MockServo:
        def __init__(self): self.angle = None
    servo_in = MockServo()
    servo_out = MockServo()

# ==============================================================================
# STATE & DATA
# ==============================================================================
class GateState:
    SCANNING = "SCANNING"
    DETECTED = "DETECTED"
    INVALID_QR = "INVALID_QR"
    API_ERROR = "API_ERROR"
    WARNING = "WARNING"
    TIMEOUT = "TIMEOUT"
    MANUAL_TYPE = "MANUAL_TYPE"       # Ask: Registered or Guest?
    MANUAL_REG = "MANUAL_REG"         # Ask: Reg ID
    MANUAL_GUEST_IN = "MANUAL_GUEST_IN"   # Ask: Make, Plate, Reason
    MANUAL_GUEST_OUT = "MANUAL_GUEST_OUT" # Ask: Ticket No
    TICKET_SHOW = "TICKET_SHOW"
    STATUS_WARNING = "STATUS_WARNING"
    GUEST_WARNING = "GUEST_WARNING"
    LOG_WARNING = "LOG_WARNING"  # Same-day double-in or double-out warning
    PROCESSING = "PROCESSING"   # QR detected, waiting for API response
    STATUS_REASON = "STATUS_REASON" # Ask reason for anomaly entry
    CAMPUS_FULL = "CAMPUS_FULL"

class SideState:
    def __init__(self, gate_type):
        self.type = gate_type # 'in' or 'out'
        self.state = GateState.SCANNING
        self.data = None # Holds QR text, or vehicle info dict
        self.snapshot = None # Image captured at moment of scan/action
        self.timeout_end = 0
        self.api_error = ""
        self.anomaly_id = None
        self.anomaly_desc = ""
        self.logged_status = None
        self.status_warning_pending = False  # True if STATUS_WARNING should follow LOG_WARNING
        
        # Manual Form Data
        self.input_field = 0 # which field is active
        self.form_data = ["", "", ""] # e.g. [make, plate, reason] or [ticket_no]
        self.ticket_generated = ""
        self.anim_offset = 0.0 if gate_type == 'in' else 1.5

side_in = SideState('in')
side_out = SideState('out')

global_stats = {"currentlyIn": 0, "visitsToday": 0}
global_logs = []
current_date_filter = time.strftime("%Y-%m-%d")
log_scroll_offset = 0

# ==============================================================================
# API HELPERS
# ==============================================================================
def headers():
    return {"X-Gate-Key": API_KEY, "Content-Type": "application/json"}

def img_to_b64(img):
    if img is None: return None
    _, buffer = cv2.imencode('.jpg', img)
    return "data:image/jpeg;base64," + base64.b64encode(buffer).decode('utf-8')

from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

api_session = requests.Session()
retries = Retry(total=2, backoff_factor=0.2, status_forcelist=[ 500, 502, 503, 504 ])
api_session.mount('http://', HTTPAdapter(max_retries=retries))
api_session.mount('https://', HTTPAdapter(max_retries=retries))

is_connected = True

def poll_api():
    global global_stats, global_logs, is_connected
    while True:
        try:
            r1 = api_session.get(f"{API_BASE}/stats", headers=headers(), timeout=5)
            if r1.status_code == 200:
                global_stats = r1.json().get("stats", global_stats)
            r1.close()
            
            r2 = api_session.get(f"{API_BASE}/logs?date={current_date_filter}", headers=headers(), timeout=5)
            if r2.status_code == 200:
                global_logs = r2.json().get("logs", [])
            r2.close()
            
            if not is_connected:
                print("API Polling: Connection restored!")
                is_connected = True
        except requests.exceptions.RequestException:
            if is_connected:
                print("API Polling error: Connection timed out or server unreachable. (Will keep trying silently...)")
                is_connected = False
        except Exception as e:
            if is_connected:
                print(f"API Polling error: {type(e).__name__}")
                is_connected = False
        time.sleep(5)

threading.Thread(target=poll_api, daemon=True).start()

# ==============================================================================
# ACTION HANDLERS
# ==============================================================================
def set_servo_angle(servo, target_angle):
    def _move():
        try:
            servo.angle = target_angle
            time.sleep(1)
            servo.angle = None
        except:
            pass
    threading.Thread(target=_move, daemon=True).start()

def open_gate(side):
    servo = servo_in if side.type == 'in' else servo_out
    set_servo_angle(servo, 90)
    side.state = GateState.TIMEOUT
    side.timeout_end = time.time() + 10

def close_gate(side):
    servo = servo_in if side.type == 'in' else servo_out
    set_servo_angle(servo, 0)
    side.state = GateState.SCANNING
    side.data = None
    side.logged_status = None

def process_qr(side, qr_text, frame):
    try:
        # Wait 1 second before capturing snapshot so the QR is fully in frame
        time.sleep(1)
        side.snapshot = frame.copy()
        r = api_session.get(f"{API_BASE}/lookup?qr={qr_text}", headers=headers(), timeout=5)
        if r.status_code == 404:
            side.state = GateState.INVALID_QR
            side.data = qr_text
        elif r.status_code == 200:
            data = r.json()
            reg = data['registration']
            last_log = data['lastLog']
            side.data = reg

            # Determine if the user is fully verified ("OK")
            is_ok = (reg['status'] == 'osa_dist' and reg.get('osa_dist_at') is not None)

            # Track the current status at the time of scanning.
            # If they are verified ("OK"), we log None so the dashboard shows "OK".
            # Otherwise, we log their actual anomaly status (e.g. 'osa_dist', 'expired').
            side.logged_status = None if is_ok else reg['status']

            # Determine if a STATUS_WARNING is needed (non-monitoring status) for BOTH gates
            needs_status_warning = not is_ok

            side.status_warning_pending = needs_status_warning

            # --- Same-day log warning check (applies to ALL vehicles/statuses) ---
            today = time.strftime("%Y-%m-%d")
            if last_log:
                log_date = last_log.get('date', '')
                if log_date == today:
                    if side.type == 'in' and last_log['type'] == 'in':
                        side.anomaly_desc = f"Vehicle already IN at {last_log['time']} today!"
                        side.anomaly_id = last_log['auto_id']
                        side.state = GateState.LOG_WARNING
                        return
                    elif side.type == 'out' and last_log['type'] == 'out':
                        side.anomaly_desc = f"Vehicle already OUT at {last_log['time']} today!"
                        side.anomaly_id = last_log['auto_id']
                        side.state = GateState.LOG_WARNING
                        return
            elif side.type == 'out' and not last_log:
                side.anomaly_desc = "No entry record found for today!"
                side.anomaly_id = None
                side.state = GateState.LOG_WARNING
                return

            # --- No log anomaly: check status for IN ---
            if needs_status_warning:
                if reg['status'] == 'osa_dist':
                    side.anomaly_desc = "IN DISTRIBUTION"
                else:
                    side.anomaly_desc = reg['status'].upper().replace('_', ' ')
                side.anomaly_id = None
                side.state = GateState.STATUS_WARNING
                return

            side.state = GateState.DETECTED
        else:
            side.state = GateState.API_ERROR
            side.api_error = f"HTTP {r.status_code}"
        r.close()
    except Exception as e:
        side.state = GateState.API_ERROR
        side.api_error = str(e)
        side.snapshot = frame.copy()

def submit_entry_exit(side, acknowledge=False):
    # Capture reason before state change
    reason = side.form_data[0].strip() if side.state == GateState.STATUS_REASON else None
    side.state = GateState.PROCESSING
    
    def _run():
        action = 'entry' if side.type == 'in' else 'exit'
        endpoint = f"{API_BASE}/{action}"
        payload = {
            "registration_id": side.data['vehicle_id'],
            "pic_base64": img_to_b64(side.snapshot),
            "logged_status": getattr(side, 'logged_status', None),
            "reason": reason
        }
        if acknowledge and side.anomaly_id:
            payload["acknowledge_auto_id"] = side.anomaly_id
            
        try:
            r = api_session.post(endpoint, json=payload, headers=headers(), timeout=5)
            r.close()
            open_gate(side)
        except Exception as e:
            side.state = GateState.API_ERROR
            side.api_error = "Submit failed: API Unreachable"
            
    threading.Thread(target=_run, daemon=True).start()

def submit_vip(side):
    side.state = GateState.PROCESSING
    def _run():
        action = 'in' if side.type == 'in' else 'out'
        try:
            r = api_session.post(f"{API_BASE}/vip", json={"action": action}, headers=headers(), timeout=5)
            if r.status_code == 200:
                open_gate(side)
            else:
                side.state = GateState.API_ERROR
                side.api_error = r.json().get('error', 'VIP Action Failed')
            r.close()
        except Exception as e:
            side.state = GateState.API_ERROR
            side.api_error = "Submit failed: API Unreachable"

    threading.Thread(target=_run, daemon=True).start()

def check_and_submit_guest(side):
    """Check for guest anomaly before submitting. Shows GUEST_WARNING if found."""
    # Anomaly checks for guests are disabled. Submit directly.
    submit_manual_guest(side)

def submit_manual_guest(side, acknowledge=False):
    # Prepare payload before state change
    payload = {
        "type": side.type,
        "pic_base64": img_to_b64(side.snapshot),
        "logged_status": getattr(side, 'logged_status', None)
    }
    if side.type == 'in':
        payload['make_model'] = side.form_data[0]
        payload['plate'] = side.form_data[1]
        payload['reason'] = side.form_data[2]
    else:
        payload['ticket_no'] = side.form_data[0]
    
    if acknowledge and side.anomaly_id:
        payload['acknowledge_log_id'] = side.anomaly_id
        
    side.state = GateState.PROCESSING
    
    def _run():
        endpoint = f"{API_BASE}/manual"
        try:
            r = api_session.post(endpoint, json=payload, headers=headers(), timeout=5)
            if r.status_code == 200:
                if side.type == 'in':
                    side.ticket_generated = r.json().get('ticket_no')
                    side.state = GateState.TICKET_SHOW
                    # gate opens after they dismiss ticket
                else:
                    open_gate(side)
            else:
                side.state = GateState.API_ERROR
                side.api_error = f"Manual submit failed: HTTP {r.status_code}"
            r.close()
        except Exception as e:
            side.state = GateState.API_ERROR
            side.api_error = "Submit failed: API Unreachable"
            
    threading.Thread(target=_run, daemon=True).start()

from pyzbar.pyzbar import decode, ZBarSymbol

# ==============================================================================
# UI RENDERING & MOUSE
# ==============================================================================
W, H = 1280, 720

# Search for the first two valid cameras
# Many USB cameras create two /dev/video nodes (video + metadata).
# We must try reading a frame to ensure it's a usable video node.
available_caps = []
for i in range(10): # Probe first 10 indices
    cap = cv2.VideoCapture(i)
    if cap.isOpened():
        ret, _ = cap.read()
        if ret:
            available_caps.append(cap)
            if len(available_caps) == 2:
                break
        else:
            cap.release()
    else:
        cap.release()

cap1 = available_caps[0] if len(available_caps) > 0 else cv2.VideoCapture(-1)
has_cam1 = cap1.isOpened()
if has_cam1:
    cap1.set(cv2.CAP_PROP_FRAME_WIDTH, W)
    cap1.set(cv2.CAP_PROP_FRAME_HEIGHT, H)

cap2 = available_caps[1] if len(available_caps) > 1 else cv2.VideoCapture(-1)
if cap2.isOpened():
    cap2.set(cv2.CAP_PROP_FRAME_WIDTH, W)
    cap2.set(cv2.CAP_PROP_FRAME_HEIGHT, H)
    has_dual_cam = True
else:
    has_dual_cam = False
    cap2.release()

# Helpers for drawing
def draw_text(img, text, pos, scale=0.6, color=(255,255,255), thick=1):
    cv2.putText(img, text, pos, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thick)

def draw_btn(img, rect, text, bg_color=(50,200,50)):
    x1, y1, w, h = rect
    cv2.rectangle(img, (x1, y1), (x1+w, y1+h), bg_color, -1)
    draw_text(img, text, (x1+10, y1+30), 0.7, (255,255,255), 2)

def in_rect(x, y, rect):
    rx, ry, rw, rh = rect
    return rx <= x <= rx+rw and ry <= y <= ry+rh

def render_side(img, side, offset_x):
    # Base layout
    cx = offset_x
    title = "ENTRANCE" if side.type == 'in' else "EXIT"
    draw_text(img, title, (cx + 10, 30), 1.0, (0, 255, 255), 2)

    # State machine UI
    if side.state == GateState.SCANNING:
        # Scanning animation line (sweeping up and down)
        cycle_duration = 3.0
        t = (time.time() + side.anim_offset) % cycle_duration
        progress = (t / (cycle_duration / 2)) if t < (cycle_duration / 2) else (2.0 - t / (cycle_duration / 2))
        line_y = int(progress * (H // 2 - 10)) + 5 # Keep it slightly within bounds
        cv2.line(img, (cx, line_y), (cx + W//2, line_y), (0, 255, 0), 2)
        
        # Transparent glow effect
        overlay = img.copy()
        cv2.rectangle(overlay, (cx, max(0, line_y - 30)), (cx + W//2, line_y), (0, 255, 0), -1)
        cv2.addWeighted(overlay, 0.2, img, 0.8, 0, img)

        draw_text(img, "No QR Code Detected", (cx + 20, 80), 0.8, (0, 255, 255), 2)
        draw_text(img, "Hold QR code anywhere in this area", (cx + 20, 110), 0.6)
        draw_btn(img, (cx + W//2 - 160, H//2 - 60, 150, 50), "MANUAL OPEN", (0,140,255))

        if side.type == 'in':
            max_cap = global_stats.get('maxCapacity', -1)
            curr_in = global_stats.get('currentlyIn', 0)
            if max_cap != -1 and curr_in >= max_cap:
                side.state = GateState.CAMPUS_FULL
    
    elif side.state == GateState.DETECTED:
        draw_text(img, f"Reg ID: {side.data['id']}", (cx + 20, 80), 0.8)
        draw_text(img, f"Vehicle: {side.data['vehicle_make']} ({side.data['vehicle_plate']})", (cx + 20, 110), 0.8)
        draw_text(img, "STATUS: MONITORING", (cx + 20, 140), 0.8, (0, 255, 0), 2)
        
        btn_text = "LET IN" if side.type == 'in' else "LET OUT"
        draw_btn(img, (cx + 20, H//2 - 70, 120, 50), btn_text)
        draw_btn(img, (cx + 150, H//2 - 70, 100, 50), "SKIP", (0,0,200))
        
    elif side.state == GateState.INVALID_QR:
        draw_text(img, "INVALID QR CODE", (cx + 20, 80), 0.8, (0,0,255), 2)
        draw_text(img, f"Content: {side.data[:20]}...", (cx + 20, 110), 0.6)
        draw_text(img, "Not a recognized registration.", (cx + 20, 140), 0.6)
        draw_btn(img, (cx + 20, H//2 - 70, 180, 50), "OPEN MANUALLY", (0,140,255))
        draw_btn(img, (cx + 210, H//2 - 70, 100, 50), "DISMISS", (100,100,100))
        
    elif side.state == GateState.WARNING:
        draw_text(img, "ANOMALY WARNING", (cx + 20, 80), 0.8, (0,165,255), 2)
        draw_text(img, side.anomaly_desc, (cx + 20, 110), 0.6)
        draw_btn(img, (cx + 20, H//2 - 70, 250, 50), "ACKNOWLEDGE & PROCEED", (0,140,255))
        draw_btn(img, (cx + 280, H//2 - 70, 100, 50), "SKIP", (0,0,200))
        
    elif side.state == GateState.STATUS_WARNING:
        draw_text(img, "STATUS WARNING", (cx + 20, 80), 0.8, (0,165,255), 2)
        draw_text(img, f"STATUS: {side.anomaly_desc}", (cx + 20, 110), 0.8, (0,165,255), 2)
        btn_text = "LET IN" if side.type == 'in' else "LET OUT"
        draw_btn(img, (cx + 20, H//2 - 70, 120, 50), btn_text, (0,140,255))
        draw_btn(img, (cx + 150, H//2 - 70, 100, 50), "SKIP", (0,0,200))
        
    elif side.state == GateState.STATUS_REASON:
        draw_text(img, "ENTER EXCEPTION REASON", (cx + 20, 80), 0.7, (0, 165, 255), 2)
        cv2.rectangle(img, (cx + 20, 100), (cx + 300, 140), (255, 255, 255), 1)
        draw_text(img, side.form_data[0] + "_", (cx + 30, 125), 0.7)
        draw_btn(img, (cx + 20, H//2 - 70, 120, 50), "SUBMIT", (50, 200, 50))
        draw_btn(img, (cx + 150, H//2 - 70, 100, 50), "CANCEL", (100, 100, 100))
        
    elif side.state == GateState.LOG_WARNING:
        # Bold red warning for same-day double-in / double-out
        draw_text(img, "!! LOG WARNING !!", (cx + 20, 60), 1.0, (0, 0, 255), 3)
        draw_text(img, side.anomaly_desc[:55], (cx + 20, 105), 0.65, (0, 100, 255), 2)
        btn_text = "PROCEED ANYWAY" if side.type == 'in' else "PROCEED ANYWAY"
        draw_btn(img, (cx + 20, H//2 - 70, 200, 50), btn_text, (0, 140, 255))
        draw_btn(img, (cx + 230, H//2 - 70, 100, 50), "SKIP", (0, 0, 200))

    elif side.state == GateState.API_ERROR:
        draw_text(img, "API ERROR", (cx + 20, 80), 0.8, (0,0,255), 2)
        draw_text(img, side.api_error[:40], (cx + 20, 110), 0.6)
        draw_btn(img, (cx + 20, H//2 - 70, 180, 50), "OPEN MANUALLY", (0,140,255))
        draw_btn(img, (cx + 210, H//2 - 70, 100, 50), "DISMISS", (100,100,100))

    elif side.state == GateState.TIMEOUT:
        rem = max(0, int(side.timeout_end - time.time()))
        draw_text(img, f"GATE OPEN - Closing in {rem}s", (cx + 20, 150), 1.0, (0,255,0), 2)
        draw_btn(img, (cx + 20, H//2 - 70, 150, 50), "FORCE CLOSE", (0,0,200))
        if rem == 0: close_gate(side)
        
    elif side.state == GateState.CAMPUS_FULL:
        draw_text(img, "CAMPUS FULL", (cx + 20, 80), 1.0, (0,0,255), 3)
        draw_text(img, f"Currently In: {global_stats.get('currentlyIn', 0)} / {global_stats.get('maxCapacity', -1)}", (cx + 20, 120), 0.7)
        draw_btn(img, (cx + 20, H//2 - 70, 230, 50), "OVERRIDE (LET IN)", (0,140,255))
        draw_btn(img, (cx + 260, H//2 - 70, 150, 50), "VIP ACCESS", (200,50,200))
        
        # Check if capacity clears
        max_cap = global_stats.get('maxCapacity', -1)
        curr_in = global_stats.get('currentlyIn', 0)
        if max_cap == -1 or curr_in < max_cap:
            side.state = GateState.SCANNING

    elif side.state == GateState.MANUAL_TYPE:
        draw_text(img, "MANUAL ENTRY", (cx + 20, 80), 0.8, (255,255,255), 2)
        draw_btn(img, (cx + 20, 110, 120, 50), "REG ID", (150,100,50))
        draw_btn(img, (cx + 150, 110, 100, 50), "GUEST", (100,150,50))
        draw_btn(img, (cx + 260, 110, 150, 50), "VIP ACCESS", (200,50,200))
        draw_btn(img, (cx + 20, H//2 - 70, 100, 50), "CANCEL", (100,100,100))
        
    elif side.state == GateState.MANUAL_REG:
        draw_text(img, "ENTER REG ID (Type on keyboard)", (cx + 20, 80), 0.7)
        cv2.rectangle(img, (cx + 20, 100), (cx + 300, 140), (255,255,255), 1)
        draw_text(img, side.form_data[0] + "_", (cx + 30, 125), 0.7)
        draw_btn(img, (cx + 20, H//2 - 70, 120, 50), "LOOKUP", (50,200,50))
        draw_btn(img, (cx + 150, H//2 - 70, 100, 50), "CANCEL", (100,100,100))
        
    elif side.state == GateState.MANUAL_GUEST_IN:
        draw_text(img, "GUEST IN (Type on keyboard & Click field)", (cx + 20, 50), 0.6)
        
        c1 = (255,255,0) if side.input_field == 0 else (255,255,255)
        draw_text(img, "Make/Model:", (cx + 20, 90), 0.6, c1)
        cv2.rectangle(img, (cx + 130, 70), (cx + 400, 100), c1, 1)
        draw_text(img, side.form_data[0] + ("_" if side.input_field==0 else ""), (cx + 135, 90), 0.6)
        
        c2 = (255,255,0) if side.input_field == 1 else (255,255,255)
        draw_text(img, "Plate:", (cx + 20, 130), 0.6, c2)
        cv2.rectangle(img, (cx + 130, 110), (cx + 400, 140), c2, 1)
        draw_text(img, side.form_data[1] + ("_" if side.input_field==1 else ""), (cx + 135, 130), 0.6)
        
        c3 = (255,255,0) if side.input_field == 2 else (255,255,255)
        draw_text(img, "Reason:", (cx + 20, 170), 0.6, c3)
        cv2.rectangle(img, (cx + 130, 150), (cx + 400, 180), c3, 1)
        draw_text(img, side.form_data[2] + ("_" if side.input_field==2 else ""), (cx + 135, 170), 0.6)
        
        draw_btn(img, (cx + 20, H//2 - 70, 120, 50), "SUBMIT", (50,200,50))
        draw_btn(img, (cx + 150, H//2 - 70, 100, 50), "CANCEL", (100,100,100))

    elif side.state == GateState.MANUAL_GUEST_OUT:
        draw_text(img, "GUEST OUT - ENTER TICKET NO:", (cx + 20, 80), 0.7)
        cv2.rectangle(img, (cx + 20, 100), (cx + 300, 140), (255,255,255), 1)
        draw_text(img, side.form_data[0] + "_", (cx + 30, 125), 0.7)
        draw_btn(img, (cx + 20, H//2 - 70, 120, 50), "SUBMIT", (50,200,50))
        draw_btn(img, (cx + 150, H//2 - 70, 100, 50), "CANCEL", (100,100,100))

    elif side.state == GateState.TICKET_SHOW:
        draw_text(img, "GUEST CHECKED IN", (cx + 20, 80), 0.8, (0,255,0), 2)
        draw_text(img, f"TICKET: {side.ticket_generated}", (cx + 20, 130), 1.2, (0,255,255), 2)
        draw_btn(img, (cx + 20, H//2 - 70, 200, 50), "OPEN GATE & DISMISS", (0,140,255))
    
    elif side.state == GateState.GUEST_WARNING:
        draw_text(img, "GUEST ANOMALY", (cx + 20, 80), 0.8, (0,165,255), 2)
        draw_text(img, side.anomaly_desc[:55], (cx + 20, 110), 0.55, (0,200,255))
        draw_btn(img, (cx + 20, H//2 - 70, 250, 50), "ACKNOWLEDGE & PROCEED", (0,140,255))
        draw_btn(img, (cx + 280, H//2 - 70, 100, 50), "SKIP", (0,0,200))

def mouse_callback(event, x, y, flags, param):
    global log_scroll_offset, current_date_filter
    
    if event == cv2.EVENT_MOUSEWHEEL:
        if x > W//2 and y > H//2: # Only scroll if hovering over logs area
            max_visible = 8
            max_offset = max(0, len(global_logs) - max_visible)
            if flags > 0: # Scroll up
                log_scroll_offset = max(0, log_scroll_offset - 1)
            else: # Scroll down
                log_scroll_offset = min(max_offset, log_scroll_offset + 1)
        return
        
    if event != cv2.EVENT_LBUTTONDOWN: return
    
    # Bottom Left - Filter
    if in_rect(x, y, (20, H - 60, 120, 40)):
        print("Filter clicked") # In a real app, open a date picker. We'll just toggle today/yesterday for demo
        if current_date_filter == time.strftime("%Y-%m-%d"):
            current_date_filter = time.strftime("%Y-%m-%d", time.localtime(time.time() - 86400))
        else:
            current_date_filter = time.strftime("%Y-%m-%d")
        log_scroll_offset = 0 # reset scroll
        return
        
    # Check sides
    for side, cx in [(side_in, 0), (side_out, W//2)]:
        if y > H//2: continue # Only top half has buttons
        
        if side.state == GateState.SCANNING:
            if in_rect(x, y, (cx + W//2 - 160, H//2 - 60, 150, 50)):
                side.state = GateState.MANUAL_TYPE
                side.form_data = ["", "", ""]
                side.snapshot = getattr(side, 'latest_crop', None)
        
        elif side.state == GateState.DETECTED:
            if in_rect(x, y, (cx + 20, H//2 - 70, 120, 50)):
                submit_entry_exit(side)
            elif in_rect(x, y, (cx + 150, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.INVALID_QR or side.state == GateState.API_ERROR:
            if in_rect(x, y, (cx + 20, H//2 - 70, 180, 50)): # MANUAL
                side.state = GateState.MANUAL_TYPE
                side.form_data = ["", "", ""]
                side.snapshot = getattr(side, 'latest_crop', None)
            elif in_rect(x, y, (cx + 210, H//2 - 70, 100, 50)): # DISMISS
                close_gate(side)
                
        elif side.state == GateState.WARNING:
            if in_rect(x, y, (cx + 20, H//2 - 70, 250, 50)):
                submit_entry_exit(side, acknowledge=True)
            elif in_rect(x, y, (cx + 280, H//2 - 70, 100, 50)):
                close_gate(side)

        elif side.state == GateState.LOG_WARNING:
            if in_rect(x, y, (cx + 20, H//2 - 70, 200, 50)):  # PROCEED ANYWAY
                # After log warning acknowledged, check if STATUS_WARNING should follow
                if getattr(side, 'status_warning_pending', False):
                    reg = side.data
                    if reg and reg.get('status') == 'osa_dist':
                        side.anomaly_desc = "IN DISTRIBUTION"
                    else:
                        side.anomaly_desc = (reg.get('status', 'UNKNOWN')).upper().replace('_', ' ') if reg else 'UNKNOWN'
                    side.anomaly_id = None
                    side.state = GateState.STATUS_WARNING
                else:
                    side.state = GateState.DETECTED
            elif in_rect(x, y, (cx + 230, H//2 - 70, 100, 50)):  # SKIP
                close_gate(side)

        elif side.state == GateState.STATUS_WARNING:
            if in_rect(x, y, (cx + 20, H//2 - 70, 120, 50)):
                if side.type == 'in':
                    side.state = GateState.STATUS_REASON
                    side.form_data = ["", "", ""]
                else:
                    submit_entry_exit(side, acknowledge=True)
            elif in_rect(x, y, (cx + 150, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.STATUS_REASON:
            if in_rect(x, y, (cx + 20, H//2 - 70, 120, 50)):
                submit_entry_exit(side, acknowledge=True)
            elif in_rect(x, y, (cx + 150, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.TIMEOUT:
            if in_rect(x, y, (cx + 20, H//2 - 70, 150, 50)):
                close_gate(side)
                
        elif side.state == GateState.CAMPUS_FULL:
            if in_rect(x, y, (cx + 20, H//2 - 70, 230, 50)):
                side.form_data = ["Override", "N/A", "Campus Full Override"]
                if side.form_data[0] == "VIP":
                    submit_vip(side)
                else:
                    submit_manual_guest(side)
            elif in_rect(x, y, (cx + 260, H//2 - 70, 150, 50)):
                side.form_data = ["VIP", "VIP", "VIP Access"]
                submit_vip(side)
                
        elif side.state == GateState.MANUAL_TYPE:
            if in_rect(x, y, (cx + 20, 110, 120, 50)): # REG
                side.state = GateState.MANUAL_REG
            elif in_rect(x, y, (cx + 150, 110, 100, 50)): # GUEST
                side.state = GateState.MANUAL_GUEST_IN if side.type == 'in' else GateState.MANUAL_GUEST_OUT
            elif in_rect(x, y, (cx + 260, 110, 150, 50)): # VIP
                if side.type == 'in':
                    side.form_data = ["VIP", "VIP", "VIP Access"]
                    submit_vip(side)
                else:
                    open_gate(side)
            elif in_rect(x, y, (cx + 20, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.MANUAL_REG:
            if in_rect(x, y, (cx + 20, H//2 - 70, 120, 50)): # LOOKUP
                process_qr(side, side.form_data[0], side.snapshot if side.snapshot is not None else cv2.imread("blank.jpg"))
            elif in_rect(x, y, (cx + 150, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.MANUAL_GUEST_IN:
            if in_rect(x, y, (cx + 130, 70, 270, 30)): side.input_field = 0
            elif in_rect(x, y, (cx + 130, 110, 270, 30)): side.input_field = 1
            elif in_rect(x, y, (cx + 130, 150, 270, 30)): side.input_field = 2
            elif in_rect(x, y, (cx + 20, H//2 - 70, 120, 50)):
                if side.form_data[0] == "VIP":
                    submit_vip(side)
                else:
                    submit_manual_guest(side)  # Guest IN: no prior ticket to check
            elif in_rect(x, y, (cx + 150, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.MANUAL_GUEST_OUT:
            if in_rect(x, y, (cx + 20, H//2 - 70, 120, 50)):
                check_and_submit_guest(side)  # Check for anomaly before submitting
            elif in_rect(x, y, (cx + 150, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.GUEST_WARNING:
            if in_rect(x, y, (cx + 20, H//2 - 70, 250, 50)):
                if side.form_data[0] == "VIP":
                    submit_vip(side)
                else:
                    submit_manual_guest(side, acknowledge=True)
            elif in_rect(x, y, (cx + 280, H//2 - 70, 100, 50)):
                close_gate(side)
                
        elif side.state == GateState.TICKET_SHOW:
            if in_rect(x, y, (cx + 20, H//2 - 70, 200, 50)):
                open_gate(side)


cv2.namedWindow("GateQR Dashboard", cv2.WINDOW_NORMAL)
cv2.setWindowProperty("GateQR Dashboard", cv2.WND_PROP_FULLSCREEN, cv2.WINDOW_FULLSCREEN)
cv2.setMouseCallback("GateQR Dashboard", mouse_callback)

while True:
    if has_dual_cam:
        ret1, frame1 = cap1.read()
        ret2, frame2 = cap2.read()
        if not ret1 or not ret2: break
        
        frame1 = cv2.resize(frame1, (W//2, H//2))
        frame2 = cv2.resize(frame2, (W//2, H//2))
        
        display = cv2.resize(frame1, (W, H)) # base
        display[0:H//2, 0:W//2] = frame1
        display[0:H//2, W//2:W] = frame2
        display[H//2:H, 0:W] = (30,30,30)

        crops = [(side_in, 0, frame1), (side_out, W//2, frame2)]
    else:
        if has_cam1:
            ret, frame = cap1.read()
            if not ret: break
        else:
            frame = np.zeros((H, W, 3), dtype=np.uint8)
            cv2.putText(frame, "NO CAMERA DETECTED (MOCK PREVIEW)", (W//2 - 250, H//2 - 20), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            time.sleep(0.05)
            
        frame = cv2.resize(frame, (W, H//2))
        
        display = cv2.resize(frame, (W, H))
        display[0:H//2, 0:W] = frame
        display[H//2:H, 0:W] = (30,30,30)

        crops = [(side_in, 0, frame[:, 0:W//2]), (side_out, W//2, frame[:, W//2:W])]

    # Process QR for both sides if scanning
    for side, cx, crop in crops:
        side.latest_crop = crop.copy()
        if side.state == GateState.SCANNING:
            decoded_objects = decode(crop, symbols=[ZBarSymbol.QRCODE])
            if decoded_objects:
                data = decoded_objects[0].data.decode("utf-8")
                print(f"[{side.type}] QR: {data}")
                side.state = GateState.PROCESSING  # Block re-trigger immediately
                crop_copy = crop.copy()
                threading.Thread(target=process_qr, args=(side, data, crop_copy), daemon=True).start()
        elif side.state == GateState.PROCESSING:
            draw_text(display, "PROCESSING...", (cx + 20, 80), 0.8, (255, 255, 0), 2)
                
        render_side(display, side, cx)

    # Render Bottom Left (Dashboard)
    cv2.rectangle(display, (0, H//2), (W//2, H), (40,40,40), -1)
    draw_text(display, "STATS DASHBOARD", (20, H//2 + 40), 1.0, (200,200,200), 2)
    max_cap = global_stats.get('maxCapacity', -1)
    cap_str = str(max_cap) if max_cap != -1 else "No Limit"
    draw_text(display, f"Currently In: {global_stats.get('currentlyIn', 0)} / {cap_str}", (20, H//2 + 90), 0.8)
    draw_text(display, f"Visits Today: {global_stats.get('visitsToday', 0)}", (20, H//2 + 130), 0.8)
    draw_btn(display, (20, H - 60, 120, 40), "FILTER", (100,100,100))
    draw_text(display, f"Date: {current_date_filter}", (150, H - 35), 0.6)

    # Render Bottom Right (Table)
    cv2.rectangle(display, (W//2, H//2), (W, H), (50,50,50), -1)
    draw_text(display, "LOGS TABLE (Scroll to view)", (W//2 + 20, H//2 + 40), 1.0, (200,200,200), 2)
    y_off = H//2 + 80
    max_visible_logs = 8
    
    # Render scrollbar track
    if len(global_logs) > max_visible_logs:
        cv2.rectangle(display, (W - 15, H//2 + 70), (W - 5, H - 20), (30,30,30), -1)
        scroll_h = max(20, int((max_visible_logs / len(global_logs)) * (H//2 - 90)))
        max_offset = max(1, len(global_logs) - max_visible_logs)
        scroll_y = H//2 + 70 + int((log_scroll_offset / max_offset) * (H//2 - 90 - scroll_h))
        cv2.rectangle(display, (W - 15, scroll_y), (W - 5, scroll_y + scroll_h), (150,150,150), -1)

    visible_logs = global_logs[log_scroll_offset : log_scroll_offset + max_visible_logs]
    for i, log in enumerate(visible_logs):
        draw_text(display, f"{log['time']} | {log['bound']} | {log['name']} | {log['plate']}", (W//2 + 20, y_off + i*35), 0.6)

    cv2.imshow("GateQR Dashboard", display)
    
    key = cv2.waitKey(10) & 0xFF
    if key == 27: # ESC
        break
    elif key != 255: # some key pressed
        char = chr(key) if key < 128 else ""
        
        # Route keystroke to active form field
        for side in [side_in, side_out]:
            if side.state in [GateState.MANUAL_REG, GateState.MANUAL_GUEST_OUT, GateState.STATUS_REASON]:
                if key == 8: side.form_data[0] = side.form_data[0][:-1] # backspace
                elif re.match(r'[a-zA-Z0-9\-_ ]', char): side.form_data[0] += char.upper()
            elif side.state == GateState.MANUAL_GUEST_IN:
                idx = side.input_field
                if key == 8: side.form_data[idx] = side.form_data[idx][:-1]
                elif char.isprintable(): side.form_data[idx] += char

cap1.release()
if has_dual_cam: cap2.release()
cv2.destroyAllWindows()