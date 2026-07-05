import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { GATE_API_KEY } from '$env/static/private';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type { RowDataPacket } from 'mysql2';

function checkAuth(request: Request): boolean {
    return request.headers.get('X-Gate-Key') === GATE_API_KEY;
}

export const POST: RequestHandler = async ({ request }) => {
    if (!checkAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { registration_id, pic_base64, logged_status } = await request.json();

        if (!registration_id) {
            return json({ error: 'Missing registration_id' }, { status: 400 });
        }

        let picUrl = null;
        if (pic_base64) {
            try {
                const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'gate');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                const base64Data = pic_base64.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                const filename = `out_${registration_id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
                const filepath = path.join(uploadDir, filename);
                
                fs.writeFileSync(filepath, buffer);
                picUrl = `/uploads/gate/${filename}`;
            } catch (err) {
                console.error('[Gate] Error saving exit image:', err);
            }
        }

        // Find the most recent open entrylog for this registration
        const [rows] = await db.query<RowDataPacket[]>(
            `SELECT auto_id FROM entrylog WHERE registration_id = ? AND \`out\` IS NULL ORDER BY \`in\` DESC LIMIT 1`,
            [registration_id]
        );

        if (rows.length > 0) {
            // Update existing open entry log with OUT time, photo, and OUT-time status
            await db.query(
                `UPDATE entrylog SET \`out\` = CURRENT_TIMESTAMP, pic_out = ?, logged_status_out = ? WHERE auto_id = ?`,
                [picUrl, logged_status || null, rows[0].auto_id]
            );
        } else {
            // No open entry log found — create a standalone OUT row
            await db.query(
                `INSERT INTO entrylog (registration_id, \`out\`, pic_out, logged_status_out) VALUES (?, CURRENT_TIMESTAMP, ?, ?)`,
                [registration_id, picUrl, logged_status || null]
            );
        }

        return json({ success: true, message: 'Exit recorded' });
    } catch (error) {
        console.error('[Gate] Exit error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
