// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

export const load = async ({ locals, cookies }: Parameters<PageServerLoad>[0]) => {
    if (!locals.user || locals.user.role !== 'osa') {
        throw redirect(303, '/login');
    }

    try {
        const [rows] = await db.query<RowDataPacket[]>(`
            SELECT r.*, d.name as department_name, d.email as department_email, u.email as user_email
            FROM registration r
            LEFT JOIN department d ON r.department_id = d.auto_id
            LEFT JOIN user u ON r.user_id = u.auto_id
            ORDER BY r.created_at DESC
        `);

        const activeTab = cookies.get('osa_active_tab') || 'validation';

        return {
            activeTab,
            applications: rows.map(app => ({
                ...app,
                created_at: app.created_at?.toISOString(),
                dept_val_at: app.dept_val_at?.toISOString(),
                osa_val_at: app.osa_val_at?.toISOString(),
                osa_dist_at: app.osa_dist_at?.toISOString(),
                dist_sched: app.dist_sched?.toISOString(),
                expires_at: app.expires_at?.toISOString(),
                revoked_at: app.revoked_at?.toISOString(),
                rejected_at: app.rejected_at?.toISOString(),
            }))
        };
    } catch (error) {
        console.error('Error loading osa applications:', error);
        return { applications: [] };
    }
};
