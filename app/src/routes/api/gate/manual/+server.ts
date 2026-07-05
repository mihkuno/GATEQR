import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { GATE_API_KEY } from '$env/static/private';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';

function checkAuth(request: Request): boolean {
    return request.headers.get('X-Gate-Key') === GATE_API_KEY;
}

function generateTicketNo() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `GUEST-${result}`;
}

async function saveImage(pic_base64: string, type: string): Promise<string | null> {
    try {
        const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'gate');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        const base64Data = pic_base64.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = `guest_${type}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        return `/uploads/gate/${filename}`;
    } catch (err) {
        console.error('[Gate] Error saving guest image:', err);
        return null;
    }
}

export const POST: RequestHandler = async ({ request }) => {
    if (!checkAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { type, ticket_no, make_model, plate, reason, pic_base64, logged_status } = await request.json();

        if (!type || (type !== 'in' && type !== 'out')) {
            return json({ error: 'Invalid type (must be in or out)' }, { status: 400 });
        }

        const picUrl = pic_base64 ? await saveImage(pic_base64, type) : null;

        if (type === 'in') {
            if (!make_model || !plate) {
                return json({ error: 'make_model and plate are required for in' }, { status: 400 });
            }

            // Generate unique ticket number
            let newTicketNo = ticket_no;
            if (!newTicketNo) {
                let isUnique = false;
                while (!isUnique) {
                    newTicketNo = generateTicketNo();
                    const [rows] = await db.query<RowDataPacket[]>('SELECT auto_id FROM guestlog WHERE ticket_no = ?', [newTicketNo]);
                    if (rows.length === 0) isUnique = true;
                }
            }

            // Insert new IN row — out/pic_out are NULL until they leave
            await db.query(
                `INSERT INTO guestlog (ticket_no, make_model, plate, reason, \`in\`, pic_in) 
                 VALUES (?, ?, ?, ?, NOW(), ?)`,
                [newTicketNo, make_model, plate, reason || null, picUrl]
            );

            return json({ success: true, ticket_no: newTicketNo, message: 'Guest entry recorded' });

        } else {
            // type === 'out'
            if (!ticket_no) {
                return json({ error: 'ticket_no is required for out' }, { status: 400 });
            }

            // Find the most recent open IN record for this ticket (no out yet)
            const [rows] = await db.query<RowDataPacket[]>(
                `SELECT auto_id FROM guestlog 
                 WHERE ticket_no = ? AND \`out\` IS NULL 
                 ORDER BY \`in\` DESC LIMIT 1`,
                [ticket_no]
            );

            if (rows.length > 0) {
                // Update the existing IN row with OUT timestamp and photo
                await db.query(
                    `UPDATE guestlog SET \`out\` = NOW(), pic_out = ?, logged_status_out = ? WHERE auto_id = ?`,
                    [picUrl, logged_status || null, rows[0].auto_id]
                );
            } else {
                // No open IN found — insert a standalone OUT row
                const [inRows] = await db.query<RowDataPacket[]>(
                    `SELECT make_model, plate FROM guestlog WHERE ticket_no = ? ORDER BY \`in\` DESC LIMIT 1`,
                    [ticket_no]
                );
                const mm = inRows[0]?.make_model || 'Unknown';
                const pl = inRows[0]?.plate || 'Unknown';
                await db.query(
                    `INSERT INTO guestlog (ticket_no, make_model, plate, \`in\`, \`out\`, pic_out, logged_status_out) 
                     VALUES (?, ?, ?, NOW(), NOW(), ?, ?)`,
                    [ticket_no, mm, pl, picUrl, logged_status || null]
                );
            }

            return json({ success: true, message: 'Guest exit recorded' });
        }
    } catch (error) {
        console.error('[Gate] Manual entry error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
