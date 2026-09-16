# GateQR — Comprehensive System Documentation

> A QR-based vehicle gate management system for Liceo de Cagayan University, integrating a SvelteKit web application with a Raspberry Pi gate controller.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Requirements](#3-requirements)
4. [Setup & Installation](#4-setup--installation)
   - [4.1 Web Application (SvelteKit)](#41-web-application-sveltekit)
   - [4.2 Raspberry Pi Gate Controller](#42-raspberry-pi-gate-controller)
5. [Running the System](#5-running-the-system)
   - [5.1 Start the Database](#51-start-the-database)
   - [5.2 Start the Web Application](#52-start-the-web-application)
   - [5.3 Start the Raspberry Pi Gate Controller](#53-start-the-raspberry-pi-gate-controller)
6. [Environment Configuration (.env)](#6-environment-configuration-env)
7. [Database Design](#7-database-design)
   - [7.1 Schema Overview](#71-schema-overview)
   - [7.2 Registration Workflow & Status States](#72-registration-workflow--status-states)
   - [7.3 The Polymorphic Email Design](#73-the-polymorphic-email-design-why-some-relationships-are-dangling)
8. [User Roles & Routing](#8-user-roles--routing)
9. [API Reference](#9-api-reference)
10. [Diagrams](#10-diagrams)
    - [10.1 Flowchart](#101-flowchart)
    - [10.2 Use Case Diagram](#102-use-case-diagram)
    - [10.3 System Architecture Diagram](#103-system-architecture-diagram)
    - [10.4 Entity Relationship Diagram (Physical ERD)](#104-entity-relationship-diagram-physical-erd)
    - [10.5 Sequence Diagram](#105-sequence-diagram)
    - [10.6 Conceptual System Diagram](#106-conceptual-system-diagram)
    - [10.7 Hardware Circuit Diagram](#107-hardware-circuit-diagram)

---

## 1. Project Overview

GateQR is a capstone project that automates vehicle access control at a university campus. It replaces manual sticker issuance with a digital QR-code system:

1. **Applicants** (students, employees, visitors, concessionaires) submit a vehicle registration form online with supporting documents.
2. The application passes through a **multi-step validation workflow**: Department Dean → OSA Admin.
3. Upon full approval, a **QR code sticker** is generated and distributed to the applicant.
4. At the campus gate, a **Raspberry Pi 4** with two USB cameras continuously scans for QR codes. When a valid QR is detected, it communicates with the web server API and **physically opens a servo-controlled barrier gate**.
5. All entries and exits are **logged** with a photo snapshot for audit purposes.

### Repository Structure

```
gateqr/
├── app/                        # SvelteKit web application
│   ├── src/
│   │   ├── lib/server/
│   │   │   ├── db.ts           # MySQL connection pool
│   │   │   ├── db.sql          # Full database schema
│   │   │   └── email.ts        # Nodemailer SMTP helper
│   │   ├── routes/             # All pages and API endpoints
│   │   │   ├── api/
│   │   │   │   ├── auth/       # Login & OTP verification
│   │   │   │   ├── apply/      # Vehicle registration submission
│   │   │   │   ├── gate/       # Gate controller endpoints (RPi-facing)
│   │   │   │   ├── departments/
│   │   │   │   ├── complaints/
│   │   │   │   ├── osa/
│   │   │   │   ├── dean/
│   │   │   │   └── settings/
│   │   │   ├── login/          # Login page
│   │   │   ├── otp/            # OTP input page
│   │   │   ├── entry/          # Application form page
│   │   │   ├── status/         # Applicant status tracker
│   │   │   ├── complaints/     # Applicant complaints page
│   │   │   ├── dean/           # Dean validation portal
│   │   │   ├── osa/            # OSA admin panel
│   │   │   └── monitor/        # Security live monitoring dashboard
│   │   └── hooks.server.ts     # JWT auth middleware & route protection
│   ├── .env                    # Web app environment variables
│   └── package.json
├── rpi/                        # Raspberry Pi gate controller
│   ├── main.py                 # Gate controller application (OpenCV + GPIO)
│   └── .env                    # RPi environment variables
└── docs/                       # This documentation
    ├── README.md
    └── diagrams/
```

---

## 2. System Architecture

The system is composed of three distinct tiers:

| Tier | Technology | Responsibility |
|------|-----------|----------------|
| **Web Application** | SvelteKit + TypeScript | Serves the portal UI, handles all business logic via REST APIs, manages authentication |
| **Database** | MySQL 8.x | Persists all application data, registrations, logs, and settings |
| **Gate Controller** | Python 3.13 on Raspberry Pi 4 | Scans QR codes via camera, communicates with the web API, physically opens/closes the gate via servo motors |

![System Architecture](diagrams/system_architecture.jpg)

---

## 3. Requirements

### Web Application

| Requirement | Version |
|-------------|---------|
| Node.js | v20 or higher |
| pnpm | v9 or higher |
| MySQL | 8.x |
| Gmail account (for SMTP via App Password) | — |

### Raspberry Pi Gate Controller

| Requirement | Notes |
|-------------|-------|
| Raspberry Pi 4 (2GB+ RAM) | Tested on Raspberry Pi OS "Trixie" |
| Python | 3.13 |
| 2× USB Webcams | One for Entrance, one for Exit |
| 2× Servo Motors (SG90 or MG996R) | Servo IN on GPIO 13, Servo OUT on GPIO 19 |
| Python packages | `opencv-python`, `requests`, `pyzbar` |
| System packages (via apt) | `python3-lgpio`, `python3-gpiozero`, `libzbar0` |

> **Important:** Do **not** install `lgpio` or `pigpio` via `pip` on Raspberry Pi OS Trixie. These must be installed via `apt` — they require pre-compiled system packages for Python 3.13 / aarch64. Installing via pip triggers a source build that will fail.

---

## 4. Setup & Installation

### 4.1 Web Application (SvelteKit)

**Step 1: Install pnpm (if not already installed)**

```bash
npm install -g pnpm
```

**Step 2: Install dependencies**

```bash
cd app
pnpm install
```

**Step 3: Configure the environment**

```bash
cp .env.example .env
```

Open `app/.env` and fill in your values. See [Section 6](#6-environment-configuration-env) for full explanation.

**Step 4: Set up the MySQL database**

Log into MySQL as root and create the database and user:

```sql
CREATE DATABASE gateqr;
CREATE USER 'myuser'@'localhost' IDENTIFIED BY 'mypassword';
GRANT ALL PRIVILEGES ON gateqr.* TO 'myuser'@'localhost';
FLUSH PRIVILEGES;
```

Import the full schema:

```bash
mysql -u myuser -p gateqr < src/lib/server/db.sql
```

**Step 5: Create the file upload directory**

```bash
mkdir -p app/static/uploads
```

---

### 4.2 Raspberry Pi Gate Controller

**Step 1: Install system-level GPIO and ZBar libraries (run once)**

```bash
sudo apt update
sudo apt install python3-lgpio python3-gpiozero libzbar0
```

> These must come from `apt`, not `pip`. See the note in [Section 3](#3-requirements).

**Step 2: Create a virtual environment with system package access**

The `--system-site-packages` flag is **required** so the venv can use the `apt`-installed `lgpio` and `gpiozero`:

```bash
cd rpi
python3 -m venv --system-site-packages venv
source venv/bin/activate
```

**Step 3: Install remaining Python dependencies**

```bash
pip install opencv-python requests pyzbar
```

**Step 4: Configure the Raspberry Pi environment**

```bash
cp .env.example .env
```

Edit `rpi/.env` and set the URL of your web server and the shared API key:

```env
API_BASE="http://192.168.1.10:5173/api/gate"
API_KEY="replace-with-a-secure-random-gate-key"
```

> The `API_KEY` here **must exactly match** `GATE_API_KEY` in `app/.env`.

**Step 5: Hardware wiring reference**

| Component | GPIO Pin |
|-----------|----------|
| Servo Motor — Entrance (IN) | GPIO 13 (PWM) |
| Servo Motor — Exit (OUT) | GPIO 19 (PWM) |
| Camera 1 — Entrance | USB |
| Camera 2 — Exit | USB |

The servo angle range is `0°` (closed) to `90°` (open), controlled with pulse widths of `0.5ms–2.5ms`. The gate automatically closes after **10 seconds** of being open.

---

## 5. Running the System

### 5.1 Start the Database

Ensure MySQL is running:

```bash
# Using systemd
sudo systemctl start mysql

# Verify it's active
sudo systemctl status mysql
```

---

### 5.2 Start the Web Application

```bash
cd app
pnpm dev
```

The application will be available at **`http://localhost:5173`**.

To make the server accessible to the Raspberry Pi on your local network, bind to all interfaces:

```bash
pnpm dev --host
```

This will also print a LAN URL such as `http://192.168.1.10:5173` — use this IP address in `rpi/.env` as your `API_BASE`.

---

### 5.3 Start the Raspberry Pi Gate Controller

On the Raspberry Pi, activate the venv and run:

```bash
cd rpi
source venv/bin/activate
python3 main.py
```

The OpenCV fullscreen dashboard will launch with four quadrants:

| Quadrant | Content |
|----------|---------|
| **Top-Left** | Entrance camera feed + gate state / controls |
| **Top-Right** | Exit camera feed + gate state / controls |
| **Bottom-Left** | Live stats (vehicles currently inside, visits today) |
| **Bottom-Right** | Scrollable vehicle log table with date filter |

**Keyboard controls:**
- `ESC` — Exit the program
- Alphanumeric keys — Type into manual entry form fields when a form is active
- `Backspace` — Delete the last character in a form field
- Mouse scroll — Scroll the log table

**Gate states:**

| State | Description |
|-------|-------------|
| `SCANNING` | Idle, actively looking for QR codes |
| `PROCESSING` | QR detected, waiting for API response |
| `DETECTED` | Valid QR found, awaiting guard confirmation (LET IN / LET OUT) |
| `STATUS_WARNING` | Vehicle has a non-standard status (e.g., expired, not yet distributed) |
| `LOG_WARNING` | Same-day duplicate entry or exit detected |
| `STATUS_REASON` | Guard must enter a written reason before overriding a status warning |
| `TIMEOUT` | Gate is open, counting down 10 seconds to auto-close |
| `INVALID_QR` | Unrecognized QR code |
| `API_ERROR` | Could not reach the web server |
| `CAMPUS_FULL` | Vehicle count has reached `max_capacity` setting |
| `MANUAL_TYPE` | Guard manually selecting: Registered ID / Guest / VIP |
| `MANUAL_REG` | Guard entering a registration ID manually |
| `MANUAL_GUEST_IN` | Guard entering guest vehicle details (make/model, plate, reason) |
| `MANUAL_GUEST_OUT` | Guard entering guest ticket number for exit |
| `TICKET_SHOW` | Guest ticket number displayed on screen |

**Running on Boot (optional):**

```bash
sudo nano /etc/systemd/system/gateqr.service
```

```ini
[Unit]
Description=GateQR Gate Controller
After=network.target

[Service]
User=pi
WorkingDirectory=/home/pi/gateqr/rpi
ExecStart=/home/pi/gateqr/rpi/venv/bin/python3 /home/pi/gateqr/rpi/main.py
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable gateqr
sudo systemctl start gateqr
```

---

## 6. Environment Configuration (.env)

### `app/.env` — Web Application

| Variable | Example Value | Purpose |
|----------|--------------|---------|
| `DATABASE_URL` | `mysql://myuser:mypassword@localhost:3306/gateqr` | Full MySQL connection string used by the `mysql2` connection pool in `db.ts` |
| `OSA_EMAIL` | `cs3.ustp@gmail.com` | **Hardcoded super-admin.** Any user logging in with this exact email is automatically granted the `osa` role, bypassing the database entirely. |
| `SECURITY_EMAIL` | `joenino@example.com` | **Hardcoded security admin.** Any login with this email gets the `security` role. Also bypasses the database. |
| `JWT_SECRET` | `super-secret-jwt-key` | Cryptographic key for signing JWT session tokens stored in `HttpOnly` cookies. **Replace with a long random string in production.** |
| `REFRESH_JWT_SECRET` | `super-secret-refresh-key` | Key for refresh token signing. **Replace in production.** |
| `SMTP_HOST` | `smtp.gmail.com` | Outbound mail server hostname |
| `SMTP_PORT` | `587` | SMTP port — `587` for STARTTLS (recommended), `465` for SSL |
| `SMTP_USER` | `yourapp@gmail.com` | Gmail account used to send all system emails (OTPs, notifications, welcome messages) |
| `SMTP_PASS` | `xxxx xxxx xxxx xxxx` | Gmail **App Password** — not your regular Gmail password. Generate one at: Google Account → Security → 2-Step Verification → App Passwords |
| `QR_EXPIRY_MONTHS` | `6` | Number of months before a distributed QR sticker expires and must be renewed |
| `GATE_API_KEY` | `my-secure-gate-key` | Shared secret key. The Raspberry Pi sends this as the `X-Gate-Key` header on every gate API request. The server rejects any request without the correct key. |

### `rpi/.env` — Raspberry Pi

| Variable | Example Value | Purpose |
|----------|--------------|---------|
| `API_BASE` | `http://192.168.1.10:5173/api/gate` | URL of the SvelteKit web app's gate API. Use the LAN IP of the server machine (not `localhost`). |
| `API_KEY` | `my-secure-gate-key` | Must match `GATE_API_KEY` in `app/.env`. Sent in the `X-Gate-Key` HTTP header to authenticate RPi requests. |

---

## 7. Database Design

### 7.1 Schema Overview

The `gateqr` database contains **9 tables**:

| Table | Purpose |
|-------|---------|
| `user` | Registered applicant accounts, keyed by email |
| `department` | University departments. Stores the Dean's email for login and notifications. **Completely separate from the `user` table.** |
| `registration` | Core entity — a vehicle registration application linking a user to an optional department |
| `Vehicle_Log` | Entry/exit event log for every registered vehicle QR scan, with photo snapshots |
| `guestlog` | Entry/exit log for unregistered/manual guest vehicles, with ticket number |
| `otp_codes` | Temporary 6-digit OTPs sent to any email for login. 10-minute expiry. |
| `complaint` | Complaints submitted by applicants to the security office |
| `settings` | Single-row system config: `max_capacity` (-1 = unlimited) |
| `vip_log` | Records VIP/override gate access events (in/out) |

### Key Relational Constraints

```
user (1) ────RESTRICT──── (many) registration (many) ────SET NULL──── (1) department
                                         │
                                    CASCADE DELETE
                                         │
                                   (many) Vehicle_Log
```

| Constraint | Behavior |
|-----------|----------|
| `registration → user` (`ON DELETE RESTRICT`) | A `user` cannot be deleted while they have any registrations. Prevents accidental data loss. |
| `registration → department` (`ON DELETE SET NULL`) | Deleting a department does not delete its members' applications. Their `department_id` is set to NULL. |
| `Vehicle_Log → registration` (`ON DELETE CASCADE`) | Deleting a registration also deletes all of its gate entry/exit logs. |

### 7.2 Registration Workflow & Status States

A registration moves through the following `status` lifecycle:

```
[SUBMIT]
   │
   ├─ Student/Employee ──► dept_val ──► osa_val ──► osa_dist
   │                          │            │            │
   │                       rejected     rejected     revoked / expired
   │
   └─ Visitor/Concessionaire ──► osa_val ──► osa_dist
```

| Status | Who Sets It | Meaning |
|--------|------------|---------|
| `dept_val` | System (on submit) | Waiting for the Department Dean to validate |
| `osa_val` | Dean (or system for visitors) | Waiting for OSA Admin to validate |
| `osa_dist` | OSA Admin | Fully approved — QR sticker generated and distributed |
| `rejected` | Dean or OSA | Application rejected |
| `revoked` | OSA Admin | Previously valid sticker manually revoked |
| `expired` | System / OSA | QR sticker validity period has ended |

At the gate, only registrations with `status = 'osa_dist'` pass without a warning. All other statuses trigger a `STATUS_WARNING` that the security guard must manually override.

### 7.3 The Polymorphic Email Design (Why Some Relationships Are "Dangling")

Two tables — `otp_codes` and `complaint` — store email addresses **without Foreign Key constraints** to the `user` table:

```sql
-- Both tables use email as a loose text reference, not a FK
otp_codes.email    VARCHAR(255) NOT NULL   -- No REFERENCES
complaint.user_email VARCHAR(255) NOT NULL -- No REFERENCES
```

**This is intentional.** The system uses email as a universal login identity for four distinct types of principals, only one of which (`applicant`) is actually stored in the `user` table:

| Email Type | Stored Where |
|-----------|-------------|
| Applicant | `user` table |
| Department Dean | `department` table |
| OSA Admin | `OSA_EMAIL` in `.env` |
| Security Admin | `SECURITY_EMAIL` in `.env` |

If we added `FOREIGN KEY (email) REFERENCES user(email)` to `otp_codes`:
- **Deans** could not receive OTPs — their email is in `department`, not `user`.
- **OSA and Security** could not receive OTPs — their emails exist only in `.env`, not in the database at all.
- **New applicants** on their first-ever login could not get an OTP — the `user` record is only created when they first submit an application, not when they first log in.

Similarly, the `department` table's `email` column is **intentionally not linked to the `user` table**. Department emails identify the Dean of a department for login and notifications. They are institutional addresses managed by OSA, completely independent of student/employee applicant accounts.

**The trade-off:** Orphaned `otp_codes` rows for deleted users will linger until naturally expired (10-minute TTL). Old `complaint` records referencing deleted users' emails will remain in the database. These are acceptable trade-offs for the flexibility the multi-identity design requires.

---

## 8. User Roles & Routing

Role is determined at login time in `/api/auth/verify` and encoded into the JWT:

| Role | How Assigned | Protected Routes |
|------|-------------|-----------------|
| `applicant` | Default — email not found in any special lookup | `/entry`, `/status`, `/complaints` |
| `dean` | Email found in the `department` table | `/dean/*` |
| `osa` | Email matches `OSA_EMAIL` in `.env` | `/osa/*` (all OSA routes) |
| `security` | Email matches `SECURITY_EMAIL` in `.env` | `/osa/dashboard`, `/osa/complaints`, `/monitor` |

Route protection is enforced server-side in [`hooks.server.ts`](../app/src/hooks.server.ts). The JWT is read from the `gateqr_session` cookie on every request and decoded to check `role`. Unauthorized access redirects to `/login`.

---

## 9. API Reference

### Authentication — `/api/auth`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/auth/login` | None | Body: `{ email }`. Generates a 6-digit OTP, stores it in `otp_codes` with a 10-minute expiry, and sends it to the email via SMTP. |
| `POST` | `/api/auth/verify` | None | Body: `{ email, otp }`. Validates the OTP, determines the user's role, and sets the `gateqr_session` JWT cookie. Returns `{ role }`. |

### Registration — `/api/apply`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `POST` | `/api/apply` | Any logged-in user | `multipart/form-data`. Accepts all registration fields and document files. Upserts the `user` record, resolves `department_id`, then inserts a `registration` row. Sends email notifications to the applicant and Dean. |

### Gate Controller — `/api/gate` *(Raspberry Pi only)*

All endpoints require the `X-Gate-Key: <GATE_API_KEY>` header.

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/gate/lookup?qr={code}` | Looks up a registration by its QR code string. Returns registration data and the most recent `Vehicle_Log` entry. |
| `POST` | `/api/gate/entry` | Body: `{ registration_id, pic_base64, logged_status, reason? }`. Creates a new `Vehicle_Log` row for vehicle entry. |
| `POST` | `/api/gate/exit` | Body: `{ registration_id, pic_base64, logged_status_out }`. Updates the latest open `Vehicle_Log` row with the exit time and photo. |
| `POST` | `/api/gate/manual` | Body: `{ type, make_model, plate, reason?, pic_base64? }` for guests. Creates a `guestlog` entry and returns a ticket number for IN events. |
| `POST` | `/api/gate/vip` | Body: `{ action: 'in'|'out' }`. Logs a VIP gate event in `vip_log`. |
| `GET` | `/api/gate/stats` | Returns `{ currentlyIn, visitsToday, maxCapacity }` for the dashboard. |
| `GET` | `/api/gate/logs?date=YYYY-MM-DD` | Returns recent log rows for the live table display on the RPi dashboard. |

### Departments — `/api/departments` *(OSA only)*

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET` | `/api/departments` | List all departments |
| `POST` | `/api/departments` | Create: `{ email, name }` |
| `PUT` | `/api/departments` | Update: `{ auto_id, email, name }` |
| `DELETE` | `/api/departments` | Delete: `{ auto_id }` |

### Complaints — `/api/complaints`

| Method | Endpoint | Auth Required | Description |
|--------|----------|---------------|-------------|
| `GET` | `/api/complaints` | Any logged-in | Applicants see their own; Security sees all with sender profile details via LEFT JOIN to `user` and `registration`. |
| `POST` | `/api/complaints` | Non-security | Body: `{ message }`. Inserts complaint and notifies Security via email. |
| `DELETE` | `/api/complaints/:id` | Complaint owner | Deletes an unread complaint. |

---

## 10. Diagrams

---

### 10.1 Flowchart

![Flowchart](diagrams/flowchart.jpg)

#### Overview

The flowchart illustrates the complete end-to-end lifecycle of a vehicle registration and campus gate entry in GateQR. It is divided into three distinct phases: **authentication**, **registration & validation**, and **physical gate entry**, making it the highest-level procedural view of how the entire system operates from start to finish.

#### Authentication Phase

The process begins when any user — regardless of role — visits the login page and submits their email. The system immediately enters a role-resolution decision tree rather than simply checking a single table. The flowchart highlights a critical architectural decision: the system checks the `department` table first, then checks hardcoded environment variables (`OSA_EMAIL`, `SECURITY_EMAIL`), and only falls back to the `applicant` role if neither check matches. This means the database is not the sole source of truth for identity — the `.env` configuration co-governs who can log in as an administrator.

Once the role is resolved, a 6-digit OTP is generated and emailed. The 10-minute expiry window enforces time-bounded access, reducing the risk of session token interception. If the OTP is invalid or expired, the system loops back — there is no account lockout mechanism shown, which is a deliberate simplicity trade-off for an internal institutional system.

#### Registration & Validation Phase

Upon successful login, applicants reach the vehicle registration form. The flowchart shows the branching logic that determines the initial application status: visitors and concessionaires bypass the departmental layer entirely and go straight to OSA (`osa_val`), while students and employees must first be validated by their department Dean (`dept_val`). This reflects the real-world institutional hierarchy where departments are responsible for vouching for their own personnel before the university's OSA office makes the final call.

The two-stage validation (Dean → OSA) is a deliberate governance design. It distributes the review burden across the institution rather than centralizing everything at OSA, which would create a bottleneck. Once OSA distributes the QR code, the status is permanently set to `osa_dist` and a physical sticker is generated for the applicant.

#### Gate Entry Phase (Raspberry Pi)

The gate phase is the most operationally critical and shows the layered safety checks the system imposes before opening a barrier. The first check is QR code validity — if the scanned data doesn't correspond to any registration in the database, the gate stays closed and the guard is offered a manual entry option. The second check is status — only `osa_dist` registrations pass silently; all others trigger a visible `STATUS_WARNING` forcing the guard to make a conscious override decision. The third check is same-day log anomaly detection — if a vehicle is scanned IN but was already logged IN today, a `LOG_WARNING` fires, protecting against tailgating or duplicate entries.

This three-layer check system means the gate is never blindly opened. Even in override scenarios, every anomalous entry is recorded with the guard's reason and a camera snapshot, creating a complete audit trail.

---

### 10.2 Use Case Diagram

![Use Case Diagram](diagrams/use_case_diagram.jpg)

#### Overview

The use case diagram maps every actor in the GateQR ecosystem to the specific functionalities they can access. It serves as a behavioral contract — defining system boundaries and clarifying exactly who is responsible for each action. Five distinct actors are identified: **Applicant**, **Dean**, **OSA Admin**, **Security Guard**, and the **Raspberry Pi** (treated as an automated system actor).

#### Actor Analysis

**Applicant** is the most numerous actor class and has the narrowest set of privileges. Their interactions are limited to self-service tasks: submitting applications, checking their own status, and filing complaints. They cannot see other users' data, validate applications, or interact with the gate. This principle of least privilege is enforced at both the route level (`hooks.server.ts`) and the API query level (WHERE clauses filter by session email).

**Dean** is a restricted administrative actor scoped to a single department. They can validate or reject applications only from their own department's members — they have no visibility into other departments' applications and cannot perform OSA-level actions like generating QR codes. This encapsulation mirrors real-world institutional boundaries.

**OSA Admin** is the most privileged human actor. They have complete visibility across all applications, manage the department registry (including the Dean accounts), generate and distribute QR codes, and can revoke or reject at any stage. They also manage the `settings` table (campus capacity) and handle complaint resolution.

**Security Guard** is an operational role with no ability to modify application data. Their portal is read-only from a registration standpoint — they can view live monitoring data and manage complaint scheduling, but cannot approve or reject vehicle registrations. This separation ensures security staff cannot manipulate the verification workflow.

**Raspberry Pi** is unusual in that it is a non-human actor with its own set of use cases. The diagram correctly shows it as a system component that initiates API calls autonomously (QR scan → lookup → entry/exit). The `<<extend>>` relationships from the RPi actor show that manual entry and VIP access are extensions of the base scanning flow, only triggered under exceptional circumstances.

#### Key Include/Extend Relationships

The `Login via OTP` use case appears as a shared `<<extend>>` prerequisite for all human actors, correctly capturing that authentication is a cross-cutting concern. The `Generate & Distribute QR Code` use case has an `<<include>>` relationship with `Validate Applications`, reflecting that a QR code can only be generated after the application has been fully validated — this is an enforced pre-condition, not an optional step.

---

### 10.3 System Architecture Diagram

![System Architecture](diagrams/system_architecture.jpg)

#### Overview

The system architecture diagram presents a **three-tier layered architecture** showing the physical and logical separation between the web application, data/configuration layer, and the hardware gate controller. Each tier has a clearly defined responsibility, and the diagram shows the communication protocols between them.

#### Tier 1 — Web Application (SvelteKit)

The top tier is a SvelteKit full-stack application that serves both the user-facing portal and the server-side REST API. SvelteKit's hybrid rendering model is well-suited here: server-side rendering provides fast initial page loads for the portal pages, while the API endpoints handle JSON communication with both the browser and the Raspberry Pi. The application exposes two distinct categories of API: **user-facing APIs** (auth, apply, complaints, departments) and **machine-facing APIs** (the `/api/gate/*` namespace exclusively for the RPi). These share the same codebase but have different authentication mechanisms — JWT cookies for users, `X-Gate-Key` header for the RPi.

#### Tier 2 — Data & Configuration Layer

The middle tier is split into two components that together define the system's runtime state. The **MySQL database** holds all mutable application state: registrations, logs, OTPs, complaints. The **`.env` configuration file** holds immutable system-level secrets and administrative identity: the OSA and Security emails, the JWT signing key, the gate API key, and SMTP credentials.

This split is architecturally significant. By externalizing administrative identities to `.env` rather than the database, the system gains a bootstrap capability — the OSA admin can log in and set up the system before any database records exist. It also means admin credentials are rotatable without a database migration, and cannot be accidentally leaked through a SQL injection attack on the application tables.

The diagram also shows that the web application communicates **outward** to an email service (Gmail SMTP via Nodemailer), making email a first-class component of the system rather than a bolt-on.

#### Tier 3 — Raspberry Pi Gate Controller

The bottom tier is a standalone Python application running on a Raspberry Pi 4. It is entirely stateless from the data perspective — it holds no local database and stores no persistent records. All state is fetched from and written to the web application's API. This design means the RPi can be replaced, rebooted, or reset without any data loss.

The RPi polls the API every 5 seconds for stats and logs (background thread), while QR scan events trigger immediate on-demand API calls. The gate hardware itself (two servo motors on GPIO 13 and 19) is abstracted behind the `gpiozero` library, and the code gracefully falls back to a mock mode if GPIO hardware is unavailable — allowing the software to be developed and tested on a desktop machine.

#### Communication Boundaries

The architecture shows a clear trust boundary: the RPi must authenticate every request with `GATE_API_KEY`, preventing unauthorized devices on the network from issuing gate commands. All human browser sessions authenticate via JWT cookies with a 7-day expiry. These two mechanisms are completely separate, ensuring that a compromised gate key cannot be used to impersonate a user, and vice versa.

---

### 10.4 Entity Relationship Diagram (Physical ERD)

![ERD](diagrams/erd_diagram.jpg)

#### Overview

The Physical ERD represents the most granular, implementation-level view of the database. Unlike logical ERDs that abstract away data types and constraints, a physical ERD maps directly to the DDL (Data Definition Language) that was executed to create the schema. Every column name, data type, length, nullability, default value, and constraint visible in the diagram corresponds exactly to a line in [`db.sql`](../app/src/lib/server/db.sql).

#### Core Entity: `registration`

The `registration` table is the largest and most central entity, which reflects its role as the system's primary domain object. It is deliberately wide — 30 columns — because it aggregates all information collected across the entire application lifecycle: personal details, vehicle details, document file paths, validation timestamps, and the current status. This denormalization is intentional: it avoids expensive JOINs when the gate controller needs to look up and display registration information rapidly. The trade-off is update anomalies (e.g., if a person's name changes, all their registrations must be updated), but this is acceptable because personal details are collected once at application time and rarely change.

The `status` ENUM column (`dept_val`, `osa_val`, `osa_dist`, `revoked`, `rejected`, `expired`) implements the application's state machine directly at the database level. Using an ENUM rather than a VARCHAR enforces that only valid status values can ever be stored, providing a data integrity guarantee that application-level code cannot accidentally bypass.

#### Referential Integrity Design Decisions

Three foreign key constraints define the structural relationships:

**`registration.user_id → user.auto_id` (ON DELETE RESTRICT):** The RESTRICT action means a `user` record cannot be deleted while any of their registrations exist. This protects against orphaned registrations with no owner, which would be a data integrity failure — the system would have vehicle logs attached to registrations that reference a deleted user. The choice of RESTRICT over CASCADE here reflects a deliberate policy: user account deletion must be a conscious, manual process that first resolves or archives all associated registrations.

**`registration.department_id → department.auto_id` (ON DELETE SET NULL):** When a department is deleted by the OSA, affected registrations have their `department_id` set to NULL rather than being deleted themselves. This is the correct behavior because the vehicle registrations belong to the individual applicants, not to the department. The department is merely a categorization and notification routing mechanism. Deleting a department should not invalidate the stickers already distributed to its members.

**`Vehicle_Log.registration_id → registration.vehicle_id` (ON DELETE CASCADE):** Log records are existentially dependent on their parent registration. If a registration is permanently removed, its entire log history becomes meaningless and should be cleaned up automatically. CASCADE here prevents orphaned log records that reference non-existent registrations.

#### Polymorphic Email Tables

The `otp_codes` and `complaint` tables are annotated with dashed borders in the diagram to visually distinguish them from fully-relational tables. Their `email` and `user_email` columns are VARCHAR fields with no REFERENCES clause — they are, in database terminology, **polymorphic associations**: a single column that can logically reference rows in multiple different tables or exist entirely outside the database (in `.env`).

This is a known pattern in database design with documented trade-offs. The advantage is flexibility — any email address, regardless of which identity store it belongs to, can use the OTP and complaint system. The disadvantage is that the database cannot enforce referential integrity on these columns; orphan prevention must be handled at the application layer (OTPs expire naturally, complaints are soft-deleted).

#### Standalone Tables

`guestlog`, `settings`, and `vip_log` are completely isolated entities with no foreign keys. `guestlog` records manual entries for unregistered vehicles and uses a ticket number as its correlation key rather than a registration ID. `settings` is a singleton table (always exactly one row with `id=1`) that stores system-wide configuration. `vip_log` records simple in/out events for override access with no vehicle details, serving only as an audit trail for capacity management purposes.

---

### 10.5 Sequence Diagram

![Sequence Diagram](diagrams/sequence_diagram.jpg)

#### Overview

The sequence diagram shows the **temporal, message-level interaction** between system components for the two most critical system flows: user authentication via OTP and vehicle gate entry via QR scan. Unlike the flowchart (which shows decision logic) or the architecture diagram (which shows static structure), the sequence diagram reveals the exact order, direction, and content of messages exchanged between lifelines over time.

#### Scenario 1: OTP Login Flow (Messages 1–11)

The login sequence begins with a `POST /api/auth/login` request from the browser carrying only the user's email. The server immediately inserts an OTP record into `otp_codes` and dispatches the email — these two operations happen synchronously before responding to the browser. This means if the email service is unreachable, the login request will fail rather than silently proceeding, ensuring the user always knows whether their OTP was actually sent.

The OTP record stored in the database includes an `expires_at` timestamp 10 minutes in the future. When the user submits their OTP on the next page (message 5), the server's SELECT query (`WHERE email = ? AND otp = ? AND expires_at > NOW()`) checks all three conditions atomically at the database level, eliminating any race condition between checking validity and checking expiry.

Messages 8–10 reveal the role-resolution mechanism: after a successful OTP, the server deletes all OTP records for that email (cleaning up regardless of which OTP they used), then queries the `department` table to check if the email belongs to a Dean. If it does, `department_id` and `role = 'dean'` are embedded into the JWT. If not, the server falls back to checking against `OSA_EMAIL` and `SECURITY_EMAIL` in memory (no additional DB query needed), or defaults to `applicant`. The resulting JWT cookie is `HttpOnly` and `SameSite: lax`, making it inaccessible to JavaScript and resistant to CSRF attacks.

#### Scenario 2: Gate QR Scan Flow (Messages 12–23)

The gate sequence is initiated by the Raspberry Pi, not a human browser. The RPi sends a GET request to `/api/gate/lookup` with the scanned QR code string and the `X-Gate-Key` authentication header. The server performs a single JOIN query across `registration` and `Vehicle_Log` to return both the full registration profile and the most recent log entry in one round trip.

The critical analysis step happens entirely on the RPi (message 16 — the self-arrow labeled "Evaluates status, checks for log anomalies"). This deliberate design keeps the gate's decision logic on the device rather than in the API, which means:
1. If the network has momentary latency, the evaluation doesn't time out.
2. The gate can display a warning UI and wait for guard input without holding an open server connection.
3. The server's gate API remains stateless — it receives a command (entry/exit) and executes it, rather than being asked to make behavioral decisions.

Once the guard confirms (message 18), the RPi posts to `/api/gate/entry` including the `registration_id`, a base64-encoded JPEG snapshot from the camera (`pic_base64`), and the `logged_status` captured at scan time. The server inserts the `Vehicle_Log` row and responds with `200 OK`. The RPi then activates the servo motor on GPIO 13 (message 23), physically raising the barrier. The servo returns to closed position after 10 seconds via a background thread, with no further API communication needed for the close event — closing is purely hardware-driven on a timer.

---

### 10.6 Conceptual System Diagram

![Conceptual System Diagram](diagrams/conceptual_diagram.jpg)

#### Overview

The conceptual system diagram presents GateQR as a **four-layer swim-lane architecture**, offering the highest-level abstraction of the system. While the architecture diagram in Section 10.3 focuses on the three deployment tiers and communication protocols, the conceptual diagram maps every functional component across four orthogonal concerns: what users see (**Presentation**), what the server does (**Application**), where data lives (**Data**), and what physical hardware operates (**Hardware**). This framing allows a reader unfamiliar with the codebase to immediately understand *what* the system does and *why* each part exists, before examining *how* any individual component works.

#### Comparison with the System Architecture Diagram (§10.3)

These two diagrams are intentionally complementary and answer different questions. Reading them together gives the most complete picture of GateQR's design.

| | **Conceptual Diagram (this section)** | **[System Architecture Diagram (§10.3)](#103-system-architecture-diagram)** |
|---|---|---|
| **Primary question** | *What exists in the system, and what role does each part play?* | *How are parts deployed, and how do they communicate?* |
| **Organization** | 4 horizontal swim-lanes by **concern** — Presentation / Application / Data / Hardware | 3 vertical **deployment tiers** — Web App / Database / RPi |
| **Level of abstraction** | High — every logical service is listed individually (QR Generator, Complaint Manager, etc.) | Mid — services are grouped by deployment unit (SvelteKit server as one node) |
| **Hardware detail** | Cameras, servos, and GPIO pin numbers appear as named components | Hardware is one box: "Raspberry Pi Gate Controller" |
| **Data layer** | Shows MySQL tables **and** `.env` as two separate, named components | `.env` is discussed in prose but not drawn as a node |
| **Protocols shown** | Lane-boundary labels only (`HTTP/JSON`, `SQL`) | Explicit directional arrows with protocol labels, auth headers, polling intervals |
| **Trust / security boundaries** | Not emphasized — focus is on functional scope | Explicitly highlighted — separate auth mechanisms (JWT vs. `X-Gate-Key`) |
| **Best read by** | Anyone seeing the system for the first time — establishes *vocabulary* | Developers and system integrators — establishes *topology and constraints* |

In short: **the conceptual diagram is a component inventory**; **the architecture diagram is a deployment and communication map**. Neither replaces the other.


#### Presentation Layer Analysis

The Presentation Layer contains exactly six pages that together cover the complete user journey. This layer is deliberately thin — each page is a front-end surface that delegates all business logic downward to the Application Layer via REST calls. Notably, the **Security Monitor Dashboard** appears here alongside the applicant-facing pages, reflecting that it is rendered in a browser even though it is operationally closer to the gate hardware. This is a conscious full-stack SvelteKit decision: rendering the dashboard server-side rather than as a separate native application keeps the entire human-interface surface in one codebase, simplifies deployment, and ensures consistent session management through the same JWT middleware.

The six pages also map cleanly to the five actor roles: Login/OTP is shared by all; Application Form and Status Tracker serve Applicants; Dean Validation Portal serves Deans; OSA Admin Panel serves OSA; and Security Monitor Dashboard serves Security Guards. There is no page in the system that can be accessed without first authenticating — the `hooks.server.ts` middleware enforces this universally.

#### Application Layer Analysis

The Application Layer houses seven distinct services, but only one of them — the **SvelteKit Server** — is a deployed process. The remaining six (Auth Service, Email Service, QR Code Generator, Gate API, Registration Workflow Engine, Complaint Manager) are logical service boundaries implemented as route groups within the same SvelteKit server. This is a deliberate architectural choice: rather than a microservices deployment (which would introduce inter-service latency, independent versioning complexity, and additional infrastructure), GateQR uses a monolithic server with internal service separation. For a university capstone at this scale, the monolithic approach provides all the organizational benefits of service decomposition — clear ownership, independent testability, distinct API contracts — without the operational overhead.

The **Gate API** box is intentionally the only component in the Application Layer that has a direct bidirectional relationship with the Hardware Layer. All other application services are exclusively invoked by the Presentation Layer (browsers). This separation means the machine-facing and human-facing interfaces cannot accidentally bleed into each other — a design constraint enforced by the `X-Gate-Key` header authentication that gate endpoints require.

#### Data Layer Analysis

The Data Layer explicitly separates **mutable runtime state** (MySQL database) from **immutable boot-time configuration** (`.env` file). This distinction matters for the system's security posture. The MySQL database is accessible via SQL — if an application bug ever allowed SQL injection, an attacker could potentially read or modify application data. However, they could not read the `.env` file through SQL alone, because the administrative identities (`OSA_EMAIL`, `SECURITY_EMAIL`) and cryptographic keys (`JWT_SECRET`, `GATE_API_KEY`) are never written into the database. This architectural separation creates a security boundary between data-tier compromise and full identity compromise.

The `.env` Config File is also the system's **bootstrap mechanism**: because the OSA Admin's email is in `.env` rather than the database, the administrator can log in, manage departments, and approve registrations even on a fresh database installation with no user records. This avoids a chicken-and-egg problem common in systems where the admin account must itself be registered before the system becomes operational.

#### Hardware Layer Analysis

The Hardware Layer shows five physical components attached to the Raspberry Pi 4: two USB cameras and two servo motors, plus the OpenCV/pyzbar/gpiozero software stack that mediates between them and the application logic. The diagram correctly shows this layer as autonomous — it pulls data from and pushes events to the Application Layer's Gate API, but it does not share any database access with the web server. All of the RPi's persistent state is written through the API: entry logs, exit logs, guest records, and VIP logs all live in MySQL and are written by the SvelteKit server on behalf of the RPi's API calls.

This stateless design has an important operational consequence: if the RPi crashes and reboots, no data is lost, because the RPi holds no local state. The only transient state on the device is the OpenCV frame buffer and the current `GateState` enum — both of which are safely initialized at startup. The servo motors return to their closed position (0°) on startup, ensuring the gate fails closed rather than open in the event of an unplanned reboot.

---

### 10.7 Hardware Circuit Diagram

![Hardware Circuit Diagram](diagrams/circuit_diagram.jpg)

#### Overview

The hardware circuit diagram provides the lowest-level physical view of the Raspberry Pi 4 gate controller, specifying every wire, GPIO pin assignment, and peripheral connection required to build the hardware side of GateQR. It complements the software documentation by answering the question any hardware builder must resolve first: *which physical wire goes where?* The diagram is organized around the central Raspberry Pi 4 board, with USB cameras on one side and servo motors on the other, reflecting their physical placement at a campus gate: cameras face the driveway while servos actuate the barrier arms.

#### Power Architecture

The entire hardware assembly is powered by a single **5V / 3A USB-C** power supply connected to the Raspberry Pi's dedicated USB-C power port. This is the only power input for the system. The Raspberry Pi then distributes power to the servo motors from its **5V header pins** (Pin 2 and Pin 4 on the 40-pin GPIO header), and provides a common **GND** reference (Pin 14) shared by both servos. This shared ground is critical: without a common GND between the Pi and the servos, the PWM signal level reference would be undefined, causing erratic servo behavior.

A single 5V/3A supply is sufficient for the Raspberry Pi 4 (which draws up to ~1.2A under load) plus two SG90-class servos (which each draw approximately 100–200mA under load). If heavier MG996R servos are used instead, a separate 5V servo power supply is recommended, with only the GND connected back to the Raspberry Pi to maintain the common reference. The circuit diagram represents the SG90/lighter-servo configuration as the baseline.

#### GPIO PWM Signal Routing

The two servo motors are controlled via **hardware PWM signals** on GPIO 13 (Pin 26, ALT0/PWM1) and GPIO 19 (Pin 35, ALT5/PWM1). Both pins share the same PWM channel hardware (PWM1 on the BCM2711 SoC), but the `gpiozero` `AngularServo` class abstracts this into independent software-controlled timings. The PWM frequency is 50Hz — the standard for hobby servo motors — with pulse widths ranging from **0.5ms** (0°, gate closed) to **2.5ms** (90°, gate open).

The choice of GPIO 13 and GPIO 19 (rather than the primary PWM pins GPIO 12 and GPIO 18) was made to avoid conflicts with audio output on the Raspberry Pi 4, which shares the PWM hardware with the 3.5mm audio jack. Using GPIO 13 and GPIO 19 (PWM1 alternate function pins) keeps the audio subsystem free and prevents audio-induced jitter on the servo signal.

The signal wire from each GPIO pin connects directly to the servo's **orange signal wire** (following the standard servo color convention: red = VCC, black = GND, orange/yellow/white = signal). No level shifting is required because the Raspberry Pi's GPIO high level (3.3V) is within the signal detection range of SG90 and MG996R servos, which accept signal voltages from 3V to 5V.

#### USB Camera Integration

The two USB webcams connect to the Raspberry Pi 4's **USB 3.0 ports** (the blue ports on the board) via standard USB-A cables. USB 3.0 is used rather than USB 2.0 because OpenCV's `VideoCapture` interface benefits from the higher throughput for frame acquisition, particularly at resolutions above 640×480. Each camera is assigned a device index by the Linux kernel at enumeration time: the Entrance camera is typically `/dev/video0` and the Exit camera `/dev/video2` (Linux enumerates some USB cameras across two device nodes — one for video, one for metadata).

The cameras are entirely self-powered through USB — they draw their 5V from the USB bus provided by the Raspberry Pi. The Raspberry Pi 4's USB controller can source up to 1.2A total across all USB ports, which is sufficient for two standard USB webcams (each typically drawing 100–300mA). No external USB hub with separate power is required for the baseline configuration.

#### Fail-Safe Gate Behavior

An important safety characteristic visible in the wiring: the servo signal wires are the only active control path to the gate barrier. There is no hardware relay, no separate motor driver board, and no emergency cut-off circuit shown — this is intentional for a servo-controlled barrier at the capstone prototype scale. The fail-safe behavior is software-enforced: when `main.py` starts, it initializes both servos to `initial_angle=None` (which de-energizes the servo, allowing it to rest in whatever position it is currently held by gravity or a return spring). The gate barrier design must include a physical return spring or counterweight so that a power loss causes the arm to fall to the closed/lowered position, not to remain raised blocking or unblocking traffic.

For a production deployment, the circuit should be extended with an **optocoupler isolation circuit** between the Pi's GPIO pins and the servo signal wire, and a dedicated servo power supply (with only GND shared to the Pi) to fully isolate the Pi's logic circuits from inductive spikes generated when the servo motor reverses direction. These additions are not shown in the diagram because they are beyond the prototype scope of the capstone project.

---

*GateQR — Liceo de Cagayan University Capstone Project*
