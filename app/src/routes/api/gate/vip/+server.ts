import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { GATE_API_KEY } from '$env/static/private';
import type { RowDataPacket } from 'mysql2';

function checkAuth(request: Request): boolean {
    return request.headers.get('X-Gate-Key') === GATE_API_KEY;
}

export const POST: RequestHandler = async ({ request }) => {
    if (!checkAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { action } = await request.json(); // 'in' or 'out'

        if (action !== 'in' && action !== 'out') {
            return json({ error: 'Invalid action' }, { status: 400 });
        }

        if (action === 'out') {
            const [inCountRows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM vip_log WHERE type="in" AND DATE(timestamp) = CURDATE()');
            const [outCountRows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM vip_log WHERE type="out" AND DATE(timestamp) = CURDATE()');
            
            const inCount = inCountRows[0].count;
            const outCount = outCountRows[0].count;
            
            if (outCount >= inCount) {
                return json({ error: 'Cannot VIP out more than VIP in' }, { status: 400 });
            }
        }

        await db.query(`INSERT INTO vip_log (type) VALUES (?)`, [action]);

        return json({ success: true, message: `VIP ${action} recorded` });
    } catch (error) {
        console.error('[Gate] VIP error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
