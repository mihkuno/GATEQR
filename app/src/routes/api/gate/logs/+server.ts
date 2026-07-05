import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';
import { GATE_API_KEY } from '$env/static/private';

export const GET: RequestHandler = async ({ request, url, locals }) => {
    const isGate = request.headers.get('X-Gate-Key') === GATE_API_KEY;
    const isOsa = locals.user && locals.user.role === 'osa';
    
    if (!isGate && !isOsa) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const dateParam = url.searchParams.get('date'); // YYYY-MM-DD
    
    try {
        let dateFilter = 'CURDATE()';
        const queryParams = [];
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            dateFilter = '?';
            queryParams.push(dateParam);
        }

        // Get registered entries for the date
        let registeredQuery = `
            SELECT 
                e.auto_id, 
                e.in as timestamp_in, 
                e.out as timestamp_out, 
                e.pic_in, 
                e.pic_out, 
                e.logged_status,
                e.logged_status_out,
                e.reason,
                r.first_name, 
                r.last_name, 
                r.vehicle_make, 
                r.vehicle_plate, 
                r.role,
                'registered' as log_type
            FROM entrylog e
            JOIN registration r ON e.registration_id = r.auto_id
            WHERE DATE(e.in) = ${dateFilter} OR (e.out IS NOT NULL AND DATE(e.out) = ${dateFilter})
        `;

        // Get guest entries for the date (new schema: single row per visit with in/out)
        let guestQuery = `
            SELECT 
                auto_id, 
                ticket_no, 
                make_model as vehicle_make, 
                plate as vehicle_plate, 
                reason, 
                \`in\` as timestamp_in,
                pic_in,
                \`out\` as timestamp_out,
                pic_out,
                logged_status,
                logged_status_out,
                'guest' as log_type
            FROM guestlog
            WHERE DATE(\`in\`) = ${dateFilter} OR (\`out\` IS NOT NULL AND DATE(\`out\`) = ${dateFilter})
        `;

        const [regRows] = await db.query<RowDataPacket[]>(registeredQuery, queryParams.length === 1 ? [queryParams[0], queryParams[0]] : []);
        const [guestRows] = await db.query<RowDataPacket[]>(guestQuery, queryParams.length === 1 ? [queryParams[0], queryParams[0]] : []);

        const logs: any[] = [];

        // Format registered logs
        regRows.forEach(row => {
            const inDate = new Date(row.timestamp_in);
            const isStandaloneOut = row.timestamp_out && row.timestamp_in.getTime() === new Date(row.timestamp_out).getTime();
            
            // Push IN event (skip if this is a standalone OUT row)
            if (!isStandaloneOut && (!dateParam || inDate.toISOString().split('T')[0] === dateParam || (!dateParam && row.timestamp_in))) {
                logs.push({
                    id: `reg-in-${row.auto_id}`,
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(inDate),
                    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(inDate),
                    name: `${row.first_name} ${row.last_name}`,
                    make: row.vehicle_make,
                    plate: row.vehicle_plate,
                    bound: 'In',
                    type: 'Registered',
                    photo: row.pic_in,
                    status: row.logged_status,
                    reason: row.reason,
                    timestamp: inDate.getTime()
                });
            }
            
            // Push OUT event
            if (row.timestamp_out) {
                const outDate = new Date(row.timestamp_out);
                if (!dateParam || outDate.toISOString().split('T')[0] === dateParam || (!dateParam)) {
                    logs.push({
                        id: `reg-out-${row.auto_id}`,
                        date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(outDate),
                        time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(outDate),
                        name: `${row.first_name} ${row.last_name}`,
                        make: row.vehicle_make,
                        plate: row.vehicle_plate,
                        bound: 'Out',
                        type: 'Registered',
                        photo: row.pic_out,
                        status: row.logged_status_out,  // OUT-time status, independent from IN
                        timestamp: outDate.getTime()
                    });
                }
            }
        });

        // Format guest logs — each row can have both IN and OUT events
        guestRows.forEach(row => {
            const inDate = new Date(row.timestamp_in);
            const isStandaloneOut = row.timestamp_out && row.timestamp_in.getTime() === new Date(row.timestamp_out).getTime();

            if (!isStandaloneOut) {
                logs.push({
                    id: `guest-in-${row.auto_id}`,
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(inDate),
                    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(inDate),
                    name: `Guest (${row.ticket_no})`,
                    make: row.vehicle_make,
                    plate: row.vehicle_plate,
                    bound: 'In',
                    type: 'Guest',
                    photo: row.pic_in,
                    status: row.logged_status,
                    timestamp: inDate.getTime()
                });
            }

            if (row.timestamp_out) {
                const outDate = new Date(row.timestamp_out);
                logs.push({
                    id: `guest-out-${row.auto_id}`,
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(outDate),
                    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(outDate),
                    name: `Guest (${row.ticket_no})`,
                    make: row.vehicle_make,
                    plate: row.vehicle_plate,
                    bound: 'Out',
                    type: 'Guest',
                    photo: row.pic_out,
                    status: row.logged_status_out,
                    timestamp: outDate.getTime()
                });
            }
        });

        // Sort descending by timestamp
        logs.sort((a, b) => b.timestamp - a.timestamp);

        return json({ logs });
    } catch (error) {
        console.error('[Gate] Logs error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
