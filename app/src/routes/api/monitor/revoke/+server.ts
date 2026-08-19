import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';

export const POST: RequestHandler = async ({ request, locals }) => {
    // Only Security can revoke
    if (!locals.user || locals.user.role !== 'security') {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { vehicle_id } = await request.json();
        if (!vehicle_id) return json({ error: 'Missing vehicle_id' }, { status: 400 });

        await db.query(`UPDATE registration SET status = 'revoked', revoked_at = NOW() WHERE vehicle_id = ?`, [vehicle_id]);
        return json({ success: true });
    } catch (error) {
        console.error('[Monitor] Revoke error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
    // Only Security can unrevoke
    if (!locals.user || locals.user.role !== 'security') {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { vehicle_id } = await request.json();
        if (!vehicle_id) return json({ error: 'Missing vehicle_id' }, { status: 400 });

        // Restore to osa_dist (fully approved) and clear the revoked timestamp
        await db.query(
            `UPDATE registration SET status = 'osa_dist', revoked_at = NULL WHERE vehicle_id = ? AND status = 'revoked'`,
            [vehicle_id]
        );
        return json({ success: true });
    } catch (error) {
        console.error('[Monitor] Unrevoke error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

