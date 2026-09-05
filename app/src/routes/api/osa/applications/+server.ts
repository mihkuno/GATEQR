import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';
import QRCode from 'qrcode';
import { join } from 'path';
import fs from 'fs';
import { sendEmail } from '$lib/server/email';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'osa') {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const [rows] = await db.query(`
            SELECT r.*, d.name as department_name, d.email as department_email, u.email as user_email 
            FROM registration r
            LEFT JOIN department d ON r.department_id = d.auto_id
            LEFT JOIN user u ON r.user_id = u.auto_id
            ORDER BY r.created_at DESC
        `);
        return json({ applications: rows });
    } catch (error) {
        console.error('Failed to fetch osa applications:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'osa') {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { registration_id, action, reason, schedule } = await request.json();

        const [rows] = await db.query<RowDataPacket[]>('SELECT r.*, u.email as user_email FROM registration r JOIN user u ON r.user_id = u.auto_id WHERE r.vehicle_id = ?', [registration_id]);
        if (rows.length === 0) {
            return json({ error: 'Application not found' }, { status: 404 });
        }

        const reg = rows[0];

        if (action === 'accept' && reg.status === 'osa_val') {
            if (!schedule) {
                return json({ error: 'Schedule is required to accept application' }, { status: 400 });
            }
            // Generate QR code (Data URI)
            // Using ID number if available, otherwise just reg ID
            const qrData = reg.id ? reg.id : `REG-${registration_id}`;
            const filename = `qr-${registration_id}-${Date.now()}.png`;
            const filepath = join(process.cwd(), 'static', 'uploads', filename);

            await QRCode.toFile(filepath, qrData);
            const qrUrl = `/uploads/${filename}`;
            
            const expiryMonths = parseInt(process.env.QR_EXPIRY_MONTHS || '6', 10);

            await db.query(`
                UPDATE registration 
                SET status = 'osa_dist', 
                    osa_val_at = NOW(), 
                    doc_qr = ?,
                    dist_sched = ?,
                    expires_at = DATE_ADD(created_at, INTERVAL ? MONTH)
                WHERE vehicle_id = ?
            `, [qrUrl, new Date(schedule), expiryMonths, registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Approved & Scheduled - Liceo GateQR',
                `Congrats your registration has been accepted. You are scheduled to visit OSA to pass the notarized filled up hardcopied agreements and notarized requirements, and receive your QR sticker code. Schedule: ${new Date(schedule).toLocaleString()}.`,
                `<p>Congrats your registration has been accepted. You are scheduled to visit OSA to pass the notarized filled up hardcopied agreements and notarized requirements, and receive your QR sticker code.</p><p>Schedule: <strong>${new Date(schedule).toLocaleString()}</strong>.</p>`
            );
        } 
        else if (action === 'reject' && reg.status === 'osa_val') {
            if (!reason) return json({ error: 'Reason required' }, { status: 400 });
            await db.query(`UPDATE registration SET status = 'rejected', rejected_at = NOW(), invalid_reason = ? WHERE vehicle_id = ?`, [reason, registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Rejected by OSA - Liceo GateQR',
                `Your vehicle sticker application was rejected by OSA. Reason: ${reason}`,
                `<p>Your vehicle sticker application was <strong>rejected by OSA</strong>.</p><p>Reason: <em>${reason}</em></p>`
            );
        }
        else if (action === 'deliver' && reg.status === 'osa_dist') {
            await db.query(`UPDATE registration SET osa_dist_at = NOW() WHERE vehicle_id = ?`, [registration_id]);
            await sendEmail(
                reg.user_email,
                'Sticker Delivered - Liceo GateQR',
                'Your vehicle sticker has been marked as delivered by OSA.',
                '<p>Your vehicle sticker has been marked as <strong>delivered</strong> by OSA.</p>'
            );
        }
        else if (action === 'revoke' && reg.status === 'osa_dist') {
            if (!reason) return json({ error: 'Reason required' }, { status: 400 });
            await db.query(`UPDATE registration SET status = 'revoked', revoked_at = NOW(), invalid_reason = ? WHERE vehicle_id = ?`, [reason, registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Revoked - Liceo GateQR',
                `Your parking access has been revoked by OSA. Reason: ${reason}`,
                `<p>Your parking access has been <strong>revoked</strong> by OSA.</p><p>Reason: <em>${reason}</em></p>`
            );
        }
        else if (action === 'retract') {
            await db.query(`UPDATE registration SET status = 'osa_val', osa_val_at = NULL, osa_dist_at = NULL, revoked_at = NULL, rejected_at = NULL, invalid_reason = NULL, doc_qr = NULL WHERE vehicle_id = ?`, [registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Approval Retracted - Liceo GateQR',
                'Your application approval has been retracted by OSA and is back under review.',
                '<p>Your application approval has been <strong>retracted</strong> by OSA and is back under review.</p>'
            );
        }
        else if (action === 'unrevoke' && reg.status === 'revoked') {
            if (reg.expires_at && new Date(reg.expires_at) < new Date()) {
                return json({ error: 'Cannot unrevoke an expired registration' }, { status: 400 });
            }
            await db.query(`UPDATE registration SET status = 'osa_dist', revoked_at = NULL, invalid_reason = NULL WHERE vehicle_id = ?`, [registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Unrevoked - Liceo GateQR',
                'Your parking access has been restored by OSA.',
                '<p>Your parking access has been <strong>restored</strong> by OSA.</p>'
            );
        }
        else if (action === 'delete') {
            const files = [reg.doc_id, reg.doc_load, reg.doc_or, reg.doc_cr, reg.doc_license, reg.doc_letter, reg.doc_qr].filter(Boolean);
            for (const file of files) {
                const filepath = join(process.cwd(), 'static', file);
                try {
                    if (fs.existsSync(filepath)) {
                        fs.unlinkSync(filepath);
                    }
                } catch (e) {
                    console.error('Failed to delete file', filepath, e);
                }
            }
            await db.query(`DELETE FROM registration WHERE vehicle_id = ?`, [registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Deleted - Liceo GateQR',
                'Your vehicle sticker application has been permanently deleted by OSA.',
                '<p>Your vehicle sticker application has been <strong>permanently deleted</strong> by OSA.</p>'
            );
        }
        else {
            return json({ error: 'Invalid action for current status' }, { status: 400 });
        }

        return json({ message: 'Application updated' });
    } catch (error) {
        console.error('Failed to update osa application:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
