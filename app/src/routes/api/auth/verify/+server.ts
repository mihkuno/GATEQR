import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import jwt from 'jsonwebtoken';
import type { RowDataPacket } from 'mysql2';
import { JWT_SECRET, OSA_EMAIL, SECURITY_EMAIL } from '$env/static/private';

export const POST: RequestHandler = async ({ request, cookies }) => {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        // Verify OTP
        const [rows] = await db.query<RowDataPacket[]>(
            'SELECT * FROM otp_codes WHERE email = ? AND otp = ? AND expires_at > NOW() ORDER BY created_at DESC LIMIT 1',
            [email, otp]
        );

        if (rows.length === 0) {
            return json({ error: 'Invalid or expired OTP' }, { status: 401 });
        }

        // Clean up used OTP (and old ones)
        await db.query('DELETE FROM otp_codes WHERE email = ?', [email]);

        // Determine user role and department
        let role = 'visitor'; // Default fallback
        let department_id = null;

        if (email === OSA_EMAIL) {
            role = 'osa';
        } else if (email === SECURITY_EMAIL) {
            role = 'security';
        } else {
            // Check if they are a Dean (in department table)
            const [deptRows] = await db.query<RowDataPacket[]>(
                'SELECT auto_id FROM department WHERE email = ? LIMIT 1',
                [email]
            );

            if (deptRows.length > 0) {
                role = 'dean';
                department_id = deptRows[0].auto_id;
            } else {
                // Otherwise, they are a student/employee/visitor applying, so role is determined at registration time.
                // We'll set a basic role here; their actual registration defines their parking rights.
                role = 'applicant';
            }
        }

        // Generate JWT
        const token = jwt.sign(
            { email, role, department_id },
            JWT_SECRET,
            { expiresIn: '7d' } // 7 days
        );

        // Set HttpOnly cookie
        cookies.set('gateqr_session', token, {
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7 // 7 days
        });

        return json({ message: 'Verified successfully', role });
    } catch (error) {
        console.error('Verify error:', error);
        return json({ error: 'Failed to verify OTP' }, { status: 500 });
    }
};
