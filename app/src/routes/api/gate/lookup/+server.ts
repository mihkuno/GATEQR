import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';
import { GATE_API_KEY } from '$env/static/private';

function checkAuth(request: Request): boolean {
    return request.headers.get('X-Gate-Key') === GATE_API_KEY;
}

export const GET: RequestHandler = async ({ request, url }) => {
    if (!checkAuth(request)) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const qr = url.searchParams.get('qr');
    if (!qr) {
        return json({ error: 'Missing qr parameter' }, { status: 400 });
    }

    try {
        let reg: RowDataPacket | null = null;

        const regIdMatch = qr.match(/^REG-(\d+)$/i);
        if (regIdMatch) {
            const autoId = parseInt(regIdMatch[1]);
            const [rows] = await db.query<RowDataPacket[]>(
                `SELECT r.*, u.email as user_email, d.name as department_name
                 FROM registration r
                 LEFT JOIN user u ON r.user_id = u.auto_id
                 LEFT JOIN department d ON r.department_id = d.auto_id
                 WHERE r.auto_id = ?`,
                [autoId]
            );
            if (rows.length > 0) reg = rows[0];
        } else {
            const [rows] = await db.query<RowDataPacket[]>(
                `SELECT r.*, u.email as user_email, d.name as department_name
                 FROM registration r
                 LEFT JOIN user u ON r.user_id = u.auto_id
                 LEFT JOIN department d ON r.department_id = d.auto_id
                 WHERE r.id = ?`,
                [qr]
            );
            if (rows.length > 0) reg = rows[0];
        }

        if (!reg) {
            return json({ registered: false }, { status: 404 });
        }

        const [logRows] = await db.query<RowDataPacket[]>(
            `SELECT auto_id, \`in\`, \`out\`
             FROM entrylog
             WHERE registration_id = ?
             ORDER BY \`in\` DESC
             LIMIT 1`,
            [reg.auto_id]
        );

        let lastLog = null;
        if (logRows.length > 0) {
            const log = logRows[0];
            lastLog = {
                auto_id: log.auto_id,
                type: log.out ? 'out' : 'in',
                date: new Date(log.in).toISOString().slice(0, 10), // YYYY-MM-DD
                time: new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit', minute: '2-digit', hour12: false
                }).format(new Date(log.in)),
            };
        }

        return json({ registered: true, registration: reg, lastLog });
    } catch (error) {
        console.error('[Gate] Lookup error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
