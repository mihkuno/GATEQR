import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';
import { SECURITY_EMAIL } from '$env/static/private';
import type { RowDataPacket } from 'mysql2';

export const GET: RequestHandler = async ({ locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        let query = '';
        let params: any[] = [];

        if (locals.user.role === 'security') {
            // Security sees all complaints, with sender details
            query = `
                SELECT c.*, u.email as sender_email, 
                       (SELECT CONCAT(r.first_name, ' ', r.last_name) FROM registration r WHERE r.user_id = u.auto_id ORDER BY r.created_at DESC LIMIT 1) as sender_name,
                       (SELECT r.contact_number FROM registration r WHERE r.user_id = u.auto_id ORDER BY r.created_at DESC LIMIT 1) as sender_phone,
                       (SELECT r.role FROM registration r WHERE r.user_id = u.auto_id ORDER BY r.created_at DESC LIMIT 1) as sender_role,
                       (SELECT r.campus FROM registration r WHERE r.user_id = u.auto_id ORDER BY r.created_at DESC LIMIT 1) as sender_campus
                FROM complaint c
                LEFT JOIN user u ON c.user_email = u.email
                ORDER BY c.created_at DESC
            `;
        } else {
            // Standard users see only their complaints
            query = `
                SELECT * FROM complaint 
                WHERE user_email = ? 
                ORDER BY created_at DESC
            `;
            params = [locals.user.email];
        }

        const [rows] = await db.query<RowDataPacket[]>(query, params);
        
        return json({ complaints: rows });
    } catch (error) {
        console.error('Error fetching complaints:', error);
        return json({ error: 'Failed to fetch complaints' }, { status: 500 });
    }
};

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user || locals.user.role === 'security') {
        return json({ error: 'Unauthorized. Only users can send complaints.' }, { status: 403 });
    }

    try {
        const { message } = await request.json();

        if (!message || message.trim() === '') {
            return json({ error: 'Message is required' }, { status: 400 });
        }

        await db.query(
            'INSERT INTO complaint (user_email, message) VALUES (?, ?)',
            [locals.user.email, message.trim()]
        );

        // Notify security
        await sendEmail(
            SECURITY_EMAIL,
            'New Complaint Received',
            `A new complaint has been submitted by ${locals.user.email}.\n\nMessage: ${message.trim()}`,
            `<p>A new complaint has been submitted by <strong>${locals.user.email}</strong>.</p>
             <p><strong>Message:</strong><br/>${message.trim().replace(/\\n/g, '<br>')}</p>
             <p>Please log in to the dashboard to review.</p>`
        );

        return json({ message: 'Complaint submitted successfully' });
    } catch (error) {
        console.error('Error creating complaint:', error);
        return json({ error: 'Failed to submit complaint' }, { status: 500 });
    }
};
