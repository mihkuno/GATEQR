import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';
import { sendEmail } from '$lib/server/email';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user || locals.user.role !== 'dean') {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { registration_id, action, reason } = await request.json();

        // Check if registration belongs to dean's dept
        const [rows] = await db.query<RowDataPacket[]>('SELECT r.*, u.email as user_email FROM registration r JOIN user u ON r.user_id = u.auto_id WHERE r.vehicle_id = ? AND r.department_id = ?', 
            [registration_id, locals.user.department_id]
        );

        if (rows.length === 0) {
            return json({ error: 'Application not found or unauthorized' }, { status: 404 });
        }

        const reg = rows[0];

        if (action === 'accept' && reg.status === 'dept_val') {
            await db.query(`UPDATE registration SET status = 'osa_val', dept_val_at = NOW() WHERE vehicle_id = ?`, [registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Approved by Dean - Liceo GateQR',
                'Your vehicle sticker application has been approved by your Dean and is now pending final validation by the Office of Student Affairs (OSA).',
                '<p>Your vehicle sticker application has been <strong>approved by your Dean</strong>.</p><p>It is now pending final validation by the Office of Student Affairs (OSA).</p>'
            );
        } 
        else if (action === 'reject' && reg.status === 'dept_val') {
            if (!reason) return json({ error: 'Reason required' }, { status: 400 });
            await db.query(`UPDATE registration SET status = 'rejected', rejected_at = NOW(), invalid_reason = ? WHERE vehicle_id = ?`, [reason, registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Rejected by Dean - Liceo GateQR',
                `Your vehicle sticker application was rejected by your Dean. Reason: ${reason}`,
                `<p>Your vehicle sticker application was <strong>rejected by your Dean</strong>.</p><p>Reason: <em>${reason}</em></p>`
            );
        }
        else if (action === 'revoke' && reg.status === 'osa_val') {
            // Dean can revoke if OSA hasn't validated yet
            if (!reason) return json({ error: 'Reason required' }, { status: 400 });
            await db.query(`UPDATE registration SET status = 'revoked', revoked_at = NOW(), invalid_reason = ? WHERE vehicle_id = ?`, [reason, registration_id]);
            await sendEmail(
                reg.user_email,
                'Application Revoked by Dean - Liceo GateQR',
                `Your vehicle sticker application was revoked by your Dean before OSA validation. Reason: ${reason}`,
                `<p>Your vehicle sticker application was <strong>revoked by your Dean</strong>.</p><p>Reason: <em>${reason}</em></p>`
            );
        }
        else if (action === 'retract' && (reg.status === 'osa_val' || reg.status === 'rejected')) {
            await db.query(`UPDATE registration SET status = 'dept_val', dept_val_at = NULL, rejected_at = NULL, invalid_reason = NULL WHERE vehicle_id = ?`, [registration_id]);
        }
        else {
            return json({ error: 'Invalid action for current status' }, { status: 400 });
        }

        return json({ message: 'Application updated' });
    } catch (error) {
        console.error('Failed to update dean application:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
