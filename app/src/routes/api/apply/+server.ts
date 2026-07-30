import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import type { RowDataPacket, ResultSetHeader } from 'mysql2';
import { writeFileSync } from 'fs';
import { join } from 'path';
import { sendEmail } from '$lib/server/email';

export const POST: RequestHandler = async ({ request, locals }) => {
    if (!locals.user) {
        return json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const formData = await request.formData();
        
        const role = formData.get('role') as string;
        const department_name = formData.get('department_name') as string;
        const id_no = formData.get('id_no') as string;
        const first_name = formData.get('first_name') as string;
        const last_name = formData.get('last_name') as string;
        const vehicle_make = formData.get('vehicle_make') as string;
        const vehicle_plate = formData.get('vehicle_plate') as string;
        const is_owner = formData.get('is_owner') as string;
        const contact_number = formData.get('contact_number') as string;
        const facebook = formData.get('facebook') as string;
        const campus = formData.get('campus') as string || 'Liceo Main';
        const year_level = formData.get('year_level') as string || null;

        const saveFile = async (fileKey: string) => {
            const file = formData.get(fileKey) as File | null;
            if (!file || file.size === 0) return null;
            const buffer = Buffer.from(await file.arrayBuffer());
            const filename = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
            const filepath = join(process.cwd(), 'static', 'uploads', filename);
            writeFileSync(filepath, buffer);
            return `/uploads/${filename}`;
        };

        const doc_or = await saveFile('doc_or');
        const doc_cr = await saveFile('doc_cr');
        const doc_license = await saveFile('doc_license');
        const doc_id = await saveFile('doc_id');
        const doc_load = await saveFile('doc_load');
        const doc_letter = await saveFile('doc_letter');
        const doc_qr = null; // Optional docs or future addition

        // 1. Ensure user exists in user table
        let [users] = await db.query<RowDataPacket[]>('SELECT auto_id FROM user WHERE email = ?', [locals.user.email]);
        let user_id = users[0]?.auto_id;

        if (!user_id) {
            const [result] = await db.query<ResultSetHeader>('INSERT INTO user (email) VALUES (?)', [locals.user.email]);
            user_id = result.insertId;

            // Send welcome email
            await sendEmail(
                locals.user.email,
                'Welcome to Liceo GateQR',
                'Welcome to Liceo GateQR! Your account has been successfully created.',
                '<h3>Welcome to Liceo GateQR!</h3><p>Your account has been successfully created.</p>'
            );
        }

        // 2. Resolve department_id
        let department_id = null;
        let dean_email = null;
        if (role !== 'visitor' && role !== 'concessionaire' && department_name) {
            const [depts] = await db.query<RowDataPacket[]>('SELECT auto_id, email FROM department WHERE name = ?', [department_name]);
            if (depts.length > 0) {
                department_id = depts[0].auto_id;
                dean_email = depts[0].email;
            } else {
                return json({ error: 'Invalid department' }, { status: 400 });
            }
        }

        // 3. Determine Initial Status based on Workflow
        // Student/Employee: dept_val
        // Visitor/Concessionaire: osa_val
        const status = (role === 'visitor' || role === 'concessionaire') ? 'osa_val' : 'dept_val';

        // 4. Insert registration
        await db.query(`
            INSERT INTO registration (
                user_id, department_id, id, role, campus, year_level, 
                first_name, last_name, contact_number, facebook, vehicle_make, vehicle_plate, is_owner, status,
                doc_id, doc_load, doc_qr, doc_or, doc_cr, doc_license, doc_letter
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            user_id,
            department_id,
            id_no || null,
            role,
            campus,
            year_level,
            first_name,
            last_name,
            contact_number,
            facebook || null,
            vehicle_make,
            vehicle_plate,
            is_owner === 'yes' ? 1 : 0,
            status,
            doc_id || null,
            doc_load || null,
            doc_qr || null,
            doc_or || '',
            doc_cr || '',
            doc_license || '',
            doc_letter || null
        ]);

        // Send submission email to applicant
        await sendEmail(
            locals.user.email,
            'Application Submitted - Liceo GateQR',
            'Your vehicle sticker application has been successfully submitted and is now under review.',
            '<p>Your vehicle sticker application has been successfully submitted and is now under review.</p>'
        );

        // Send notification to dean if needed
        if (status === 'dept_val' && dean_email) {
            await sendEmail(
                dean_email,
                'New Application Received - Liceo GateQR',
                `You received a new vehicle sticker application from ${first_name} ${last_name}. Please log in to the portal to review it.`,
                `<p>You received a new vehicle sticker application from <strong>${first_name} ${last_name}</strong>.</p><p>Please log in to the portal to review it.</p>`
            );
        }

        return json({ message: 'Application submitted successfully', status });
    } catch (error) {
        console.error('Failed to submit application:', error);
        return json({ error: 'Internal Server Error' }, { status: 500 });
    }
};
