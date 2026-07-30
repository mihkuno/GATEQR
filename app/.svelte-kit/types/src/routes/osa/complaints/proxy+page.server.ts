// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
    if (!locals.user || (locals.user.role !== 'security' && locals.user.role !== 'osa')) {
        throw redirect(303, '/login');
    }

    let unreadComplaints = 0;
    try {
        const [cRows] = await db.query<RowDataPacket[]>('SELECT COUNT(*) as count FROM complaint WHERE is_read = false');
        unreadComplaints = cRows[0].count;
    } catch (e) {
        console.error('Failed to count unread complaints:', e);
    }

    return { userRole: locals.user.role, unreadComplaints };
};
