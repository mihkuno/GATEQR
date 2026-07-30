import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';
import type { RowDataPacket } from 'mysql2';

export const PATCH: RequestHandler = async ({ params, request, locals }) => {
    if (!locals.user || locals.user.role !== 'security') {
        return json({ error: 'Unauthorized' }, { status: 403 });
    }

    try {
        const { id } = params;
        const { is_read, schedule, status } = await request.json();

        // Get the current complaint to check if schedule/status changed
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT * FROM complaint WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return json({ error: 'Complaint not found' }, { status: 404 });
        }

        const complaint = rows[0];

        // Update fields if provided
        let query = 'UPDATE complaint SET ';
        const queryParams: any[] = [];
        const updates: string[] = [];

        if (is_read !== undefined) {
            updates.push('is_read = ?');
            queryParams.push(is_read);
        }

        if (schedule !== undefined) {
            updates.push('schedule = ?');
            queryParams.push(schedule);
        }

        if (status !== undefined) {
            updates.push('status = ?');
            queryParams.push(status);
        }

        if (updates.length > 0) {
            query += updates.join(', ') + ' WHERE id = ?';
            queryParams.push(id);
            await db.query(query, queryParams);
        }

        // Send email if schedule or status changed
        if (schedule && schedule !== complaint.schedule) {
            const formattedDate = new Date(schedule).toLocaleString();
            await sendEmail(
                complaint.user_email,
                'Complaint Schedule Update',
                `Your complaint has been scheduled for a meeting on ${formattedDate}. Please proceed to the security office.`,
                `<p>Your complaint has been scheduled for a meeting on <strong>${formattedDate}</strong>.</p><p>Please proceed to the security office.</p>`
            );
        }

        if (status === 'resolved' && complaint.status !== 'resolved') {
            await sendEmail(
                complaint.user_email,
                'Complaint Resolved',
                `Your complaint has been marked as resolved by the security office.`,
                `<p>Your complaint has been marked as resolved by the security office.</p>`
            );
        }

        return json({ message: 'Complaint updated successfully' });
    } catch (error) {
        console.error('Error updating complaint:', error);
        return json({ error: 'Failed to update complaint' }, { status: 500 });
    }
};

export const DELETE: RequestHandler = async ({ params, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = params;

        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT * FROM complaint WHERE id = ?',
            [id]
        );

        if (rows.length === 0) {
            return json({ error: 'Complaint not found' }, { status: 404 });
        }

        const complaint = rows[0];

        // Security can always delete. User can only delete if not read.
        if (locals.user.role !== 'security') {
            if (complaint.user_email !== locals.user.email) {
                return json({ error: 'Unauthorized' }, { status: 403 });
            }
            if (complaint.is_read) {
                return json({ error: 'Cannot delete a complaint that has already been read by security' }, { status: 400 });
            }
        }

        await db.query('DELETE FROM complaint WHERE id = ?', [id]);

        return json({ message: 'Complaint deleted successfully' });
    } catch (error) {
        console.error('Error deleting complaint:', error);
        return json({ error: 'Failed to delete complaint' }, { status: 500 });
    }
};
