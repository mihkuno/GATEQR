import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

export const load: PageServerLoad = async ({ locals }) => {
    if (!locals.user || locals.user.role !== 'security') {
        throw redirect(303, '/auth/login');
    }

    const [rows] = await db.query<RowDataPacket[]>(`
        SELECT r.*, u.email as user_email, d.name as department_name
        FROM registration r
        LEFT JOIN user u ON r.user_id = u.auto_id
        LEFT JOIN department d ON r.department_id = d.auto_id
        ORDER BY r.created_at DESC
    `);

    return {
        userRole: locals.user.role,
        vehicles: rows
    };
};
