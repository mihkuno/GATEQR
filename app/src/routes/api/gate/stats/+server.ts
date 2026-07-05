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
    const isOsa = locals.user && locals.user.role === 'osa';
    
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
                visitsToday: totalVisitsToday
            },
            hourlyChart: hourlyData
        });
    } catch (error) {
        console.error('[Gate] Stats error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
