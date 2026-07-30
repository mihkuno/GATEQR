import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';
import { GATE_API_KEY } from '$env/static/private';

export const GET: RequestHandler = async ({ request, url, locals }) => {
    const isGate = request.headers.get('X-Gate-Key') === GATE_API_KEY;
    const isOsa = locals.user && (locals.user.role === 'osa' || locals.user.role === 'security');
    
    if (!isGate && !isOsa) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    const dateParam  = url.searchParams.get('date') || '';
    const search     = (url.searchParams.get('search') || '').trim().toLowerCase();
    const typeFilter = url.searchParams.get('type')  || 'all';   // all | registered | guest
    const boundFilter= url.searchParams.get('bound') || 'all';   // all | in | out
    const roleFilter = url.searchParams.get('role')  || 'all';   // all | student | employee | visitor | concessionaire
    const campusFilter = url.searchParams.get('campus') || 'all';
    const page       = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
    const limit      = Math.min(100, Math.max(1, parseInt(url.searchParams.get('limit') || '25')));

    try {
        let dateFilter = 'CURDATE()';
        const dateParams: string[] = [];
        if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
            dateFilter = '?';
            dateParams.push(dateParam);
        }

        // ── Registered entries ──────────────────────────────────────────────
        const hasRegRoles = roleFilter === 'all' || roleFilter.split(',').some(r => r !== 'guest');
        const regRoleCsv = roleFilter !== 'all' ? roleFilter.split(',').filter(r => r !== 'guest').join(',') : '';

        const regRows: RowDataPacket[] = (typeFilter === 'guest' || !hasRegRoles) ? [] : await (async () => {
            const [rows] = await db.query<RowDataPacket[]>(`
                SELECT 
                    e.auto_id, 
                    e.\`in\` as timestamp_in, 
                    e.\`out\` as timestamp_out, 
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
                WHERE (DATE(e.\`in\`) = ${dateFilter} OR (e.\`out\` IS NOT NULL AND DATE(e.\`out\`) = ${dateFilter}))
                ${regRoleCsv ? 'AND FIND_IN_SET(r.role, ?)' : ''}
                ${campusFilter !== 'all' ? 'AND r.campus = ?' : ''}
            `, [...dateParams, ...dateParams, ...(regRoleCsv ? [regRoleCsv] : []), ...(campusFilter !== 'all' ? [campusFilter] : [])]);
            return rows;
        })();

        // ── Guest entries ────────────────────────────────────────────────────
        const isGuestIncluded = (roleFilter === 'all' || roleFilter.split(',').includes('guest')) && campusFilter === 'all';
        const guestRows: RowDataPacket[] = (typeFilter === 'registered' || !isGuestIncluded) ? [] : await (async () => {
            const [rows] = await db.query<RowDataPacket[]>(`
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
                WHERE (DATE(\`in\`) = ${dateFilter} OR (\`out\` IS NOT NULL AND DATE(\`out\`) = ${dateFilter}))
            `, [...dateParams, ...dateParams]);
            return rows;
        })();

        // ── Flatten to log events ────────────────────────────────────────────
        const logs: any[] = [];

        regRows.forEach(row => {
            const inDate = new Date(row.timestamp_in);
            const isStandaloneOut = row.timestamp_out && row.timestamp_in.getTime() === new Date(row.timestamp_out).getTime();

            if (!isStandaloneOut && (boundFilter === 'all' || boundFilter === 'in')) {
                logs.push({
                    id: `reg-in-${row.auto_id}`,
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(inDate),
                    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(inDate),
                    name: `${row.first_name} ${row.last_name}`,
                    role: row.role,
                    make: row.vehicle_make,
                    plate: row.vehicle_plate,
                    campus: row.campus,
                    bound: 'In',
                    type: 'Registered',
                    photo: row.pic_in,
                    status: row.logged_status,
                    reason: row.reason,
                    timestamp: inDate.getTime()
                });
            }

            if (row.timestamp_out && (boundFilter === 'all' || boundFilter === 'out')) {
                const outDate = new Date(row.timestamp_out);
                logs.push({
                    id: `reg-out-${row.auto_id}`,
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(outDate),
                    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(outDate),
                    name: `${row.first_name} ${row.last_name}`,
                    role: row.role,
                    make: row.vehicle_make,
                    plate: row.vehicle_plate,
                    campus: row.campus,
                    bound: 'Out',
                    type: 'Registered',
                    photo: row.pic_out,
                    status: row.logged_status_out,
                    reason: row.reason,
                    timestamp: outDate.getTime()
                });
            }
        });

        guestRows.forEach(row => {
            const inDate = new Date(row.timestamp_in);
            const isStandaloneOut = row.timestamp_out && row.timestamp_in.getTime() === new Date(row.timestamp_out).getTime();

            if (!isStandaloneOut && (boundFilter === 'all' || boundFilter === 'in')) {
                logs.push({
                    id: `guest-in-${row.auto_id}`,
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(inDate),
                    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(inDate),
                    name: `Guest (${row.ticket_no})`,
                    role: 'guest',
                    make: row.vehicle_make,
                    plate: row.vehicle_plate,
                    bound: 'In',
                    type: 'Guest',
                    photo: row.pic_in,
                    status: row.logged_status,
                    timestamp: inDate.getTime()
                });
            }

            if (row.timestamp_out && (boundFilter === 'all' || boundFilter === 'out')) {
                const outDate = new Date(row.timestamp_out);
                logs.push({
                    id: `guest-out-${row.auto_id}`,
                    date: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(outDate),
                    time: new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(outDate),
                    name: `Guest (${row.ticket_no})`,
                    role: 'guest',
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

        // ── Sort descending ──────────────────────────────────────────────────
        logs.sort((a, b) => b.timestamp - a.timestamp);

        // ── Search filter (after merge & sort) ──────────────────────────────
        let filtered = logs;
        if (search) {
            const terms = search.split(/\s+/).filter(Boolean);
            filtered = logs.filter(l => {
                const fullString = Object.values(l)
                    .filter(val => val !== null && val !== undefined)
                    .map(val => String(val).toLowerCase())
                    .join(' ');
                return terms.every(term => fullString.includes(term));
            });
        }

        // ── Paginate ─────────────────────────────────────────────────────────
        const total = filtered.length;
        const totalPages = Math.max(1, Math.ceil(total / limit));
        const safePage = Math.min(page, totalPages);
        const sliced = filtered.slice((safePage - 1) * limit, safePage * limit);

        return json({ logs: sliced, total, page: safePage, totalPages, limit });
    } catch (error) {
        console.error('[Gate] Logs error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
