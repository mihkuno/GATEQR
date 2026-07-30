import nodemailer from 'nodemailer';
import { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } from '$env/static/private';

const transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

export async function sendEmail(to: string, subject: string, text: string, html?: string) {
    try {
        await transporter.sendMail({
            from: '"GateQR" <noreply@gateqr.liceo.edu.ph>',
            to,
            subject,
            text,
            html: html || `<p>${text.replace(/\n/g, '<br>')}</p>`
        });
        console.log(`[Email] Sent to ${to}: ${subject}`);
    } catch (error) {
        console.error(`[Email Error] Failed to send to ${to}:`, error);
    }
}
