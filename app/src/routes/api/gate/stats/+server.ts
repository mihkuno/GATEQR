import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';
import { GATE_API_KEY } from '$env/static/private';

// Optionally check auth if this is meant for the gate, 
// but we might want this route to be accessible via session for the web dashboard too.
export const GET: RequestHandler = async ({ request, url, locals }) => {
    // Allow either X-Gate-Key (from RPi) or logged-in OSA user (from Web)
    const isGate = request.headers.get('X-Gate-Key') === GATE_API_KEY;
    const isOsa = locals.user && (locals.user.role === 'osa' || locals.user.role === 'security');
    
    if (!isGate && !isOsa) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const [inRows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM entrylog WHERE `out` IS NULL');
        const currentlyIn = inRows[0].count;

        const [todayRows] = await db.query<RowDataPacket[]>(
            'SELECT COUNT(*) as count FROM entrylog WHERE DATE(`in`) = CURDATE()'
        );
        const visitsToday = todayRows[0].count;

        // Also count guests currently in (have `in` but no `out` yet)
        const [guestInRows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM guestlog WHERE `out` IS NULL');
        const guestCurrentlyIn = guestInRows[0].count;

        const [guestTodayRows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM guestlog WHERE DATE(`in`) = CURDATE()');
        const guestVisitsToday = guestTodayRows[0].count;

        const totalCurrentlyIn = currentlyIn + guestCurrentlyIn;
        const totalVisitsToday = visitsToday + guestVisitsToday;

        // Anomalies today (registered + guest entries with a logged_status)
        const [anomalyRegRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM entrylog WHERE DATE(\`in\`) = CURDATE() AND (logged_status IS NOT NULL AND logged_status != '')`
        );
        const [anomalyGuestRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM guestlog WHERE DATE(\`in\`) = CURDATE() AND (logged_status IS NOT NULL AND logged_status != '')`
        );
        const anomaliesToday = anomalyRegRows[0].count + anomalyGuestRows[0].count;

        // Role breakdown for today (registered entries only)
        const [roleBreakdownRows] = await db.query<RowDataPacket[]>(`
            SELECT r.role, COUNT(*) as count
            FROM entrylog e
            JOIN registration r ON e.registration_id = r.auto_id
            WHERE DATE(e.\`in\`) = CURDATE()
            GROUP BY r.role
        `);
        const roleBreakdown: Record<string, number> = { student: 0, employee: 0, visitor: 0, concessionaire: 0, guest: guestVisitsToday };
        roleBreakdownRows.forEach(row => { roleBreakdown[row.role] = row.count; });

        // Hourly breakdown for today (entries only)
        const [hourlyRows] = await db.query<RowDataPacket[]>(
            `SELECT HOUR(\`in\`) as hour, COUNT(*) as count 
             FROM entrylog 
             WHERE DATE(\`in\`) = CURDATE() 
             GROUP BY HOUR(\`in\`)`
        );

        const [guestHourlyRows] = await db.query<RowDataPacket[]>(
            `SELECT HOUR(\`in\`) as hour, COUNT(*) as count 
             FROM guestlog 
             WHERE DATE(\`in\`) = CURDATE() 
             GROUP BY HOUR(\`in\`)`
        );

        const hourlyData = Array(24).fill(0);
        hourlyRows.forEach(row => { hourlyData[row.hour] += row.count; });
        guestHourlyRows.forEach(row => { hourlyData[row.hour] += row.count; });

        return json({
            stats: {
                currentlyIn: totalCurrentlyIn,
                visitsToday: totalVisitsToday,
                registeredIn: currentlyIn,
                guestsIn: guestCurrentlyIn,
                anomaliesToday
            },
            roleBreakdown,
            hourlyChart: hourlyData
        });
    } catch (error) {
        console.error('[Gate] Stats error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
