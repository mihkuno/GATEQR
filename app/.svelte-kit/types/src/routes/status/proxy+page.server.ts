// @ts-nocheck
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

export const load = async ({ locals }: Parameters<PageServerLoad>[0]) => {
    if (!locals.user) {
        throw redirect(303, '/login');
    }

    try {
        // Fetch the most recent application for this user
        const [rows] = await db.query<RowDataPacket[]>(`
            SELECT r.*, d.name as department_name, d.email as department_email
            FROM registration r
            LEFT JOIN department d ON r.department_id = d.auto_id
            WHERE r.user_id = (SELECT auto_id FROM user WHERE email = ?)
            ORDER BY r.created_at DESC LIMIT 1
        `, [locals.user.email]);

        // Count complaints with a schedule (new alert for the user)
        const [schedRows] = await db.query<RowDataPacket[]>(
            `SELECT COUNT(*) as count FROM complaint WHERE user_email = ? AND schedule IS NOT NULL AND status != 'resolved'`,
            [locals.user.email]
        );
        const scheduledCount = schedRows[0].count;

        const application = rows.length > 0 ? rows[0] : null;

        return {
            userEmail: locals.user.email,
            scheduledCount,
            application: application ? {
                ...application,
                // Serialize dates for SvelteKit
                created_at: application.created_at?.toISOString(),
                dept_val_at: application.dept_val_at?.toISOString(),
                osa_val_at: application.osa_val_at?.toISOString(),
                osa_dist_at: application.osa_dist_at?.toISOString(),
                dist_sched: application.dist_sched?.toISOString(),
                expires_at: application.expires_at?.toISOString(),
                revoked_at: application.revoked_at?.toISOString(),
                rejected_at: application.rejected_at?.toISOString(),
            } : null
        };
    } catch (error) {
        console.error('Error loading status:', error);
        return {
            userEmail: locals.user.email,
            application: null
        };
    }
};
