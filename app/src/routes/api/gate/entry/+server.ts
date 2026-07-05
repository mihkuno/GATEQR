import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { GATE_API_KEY } from '$env/static/private';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

function checkAuth(request: Request): boolean {
    return request.headers.get('X-Gate-Key') === GATE_API_KEY;
}

export const POST: RequestHandler = async ({ request }) => {
    if (!checkAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { registration_id, pic_base64, logged_status, reason } = await request.json();

        if (!registration_id) {
            return json({ error: 'Missing registration_id' }, { status: 400 });
        }

        let picUrl = null;
        if (pic_base64) {
            try {
                // Ensure directory exists
                const uploadDir = path.join(process.cwd(), 'static', 'uploads', 'gate');
                if (!fs.existsSync(uploadDir)) {
                    fs.mkdirSync(uploadDir, { recursive: true });
                }

                // Decode base64
                const base64Data = pic_base64.replace(/^data:image\/\w+;base64,/, '');
                const buffer = Buffer.from(base64Data, 'base64');
                
                const filename = `in_${registration_id}_${Date.now()}_${crypto.randomBytes(4).toString('hex')}.jpg`;
                const filepath = path.join(uploadDir, filename);
                
                fs.writeFileSync(filepath, buffer);
                picUrl = `/uploads/gate/${filename}`;
            } catch (err) {
                console.error('[Gate] Error saving entry image:', err);
                // Continue without image if it fails
            }
        }

        await db.query(
            `INSERT INTO entrylog (registration_id, pic_in, logged_status, reason) VALUES (?, ?, ?, ?)`,
            [registration_id, picUrl, logged_status || null, reason || null]
        );

        return json({ success: true, message: 'Entry recorded' });
    } catch (error) {
        console.error('[Gate] Entry error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
