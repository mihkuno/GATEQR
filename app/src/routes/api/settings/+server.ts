import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket } from 'mysql2';

export const GET: RequestHandler = async ({ locals }) => {
    // Both OSA and Security can view settings
    const isOsaOrSecurity = locals.user && (locals.user.role === 'osa' || locals.user.role === 'security');
    
    if (!isOsaOrSecurity) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const [rows] = await db.query<RowDataPacket[]>('SELECT max_capacity FROM settings WHERE id = 1');
        const maxCapacity = rows.length > 0 ? rows[0].max_capacity : -1;

        return json({ max_capacity: maxCapacity });
    } catch (error) {
        console.error('[Settings] GET error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};

export const PUT: RequestHandler = async ({ request, locals }) => {
    const isOsaOrSecurity = locals.user && (locals.user.role === 'osa' || locals.user.role === 'security');
    
    if (!isOsaOrSecurity) {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { max_capacity } = await request.json();

        if (typeof max_capacity !== 'number') {
            return json({ error: 'max_capacity must be a number' }, { status: 400 });
        }

        await db.query(
            `INSERT INTO settings (id, max_capacity) VALUES (1, ?) ON DUPLICATE KEY UPDATE max_capacity = ?`,
            [max_capacity, max_capacity]
        );

        return json({ success: true, max_capacity });
    } catch (error) {
        console.error('[Settings] PUT error:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
