import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { sendEmail } from '$lib/server/email';

export const POST: RequestHandler = async ({ request }) => {
    try {
        const { email } = await request.json();

        if (!email) {
            return json({ error: 'Email is required' }, { status: 400 });
        }

        // Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Expiration time: 10 minutes from now
        const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

        // Store OTP in database
        await db.query(
            'INSERT INTO otp_codes (email, otp, expires_at) VALUES (?, ?, ?)',
            [email, otp, expiresAt]
        );

        // Send email
        await sendEmail(
            email,
            'Your GateQR Login Code',
            `Your login code is: ${otp}. It will expire in 10 minutes.`,
            `<h3>Welcome to GateQR</h3><p>Your login code is: <strong>${otp}</strong></p><p>It will expire in 10 minutes.</p>`
        );

        // For testing/development, log the OTP
        console.log(`[OTP] Generated for ${email}: ${otp}`);

        return json({ message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Login error:', error);
        return json({ error: 'Failed to process login request' }, { status: 500 });
    }
};
