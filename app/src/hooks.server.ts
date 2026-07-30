import { type Handle, redirect } from '@sveltejs/kit';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '$env/static/private';

export const handle: Handle = async ({ event, resolve }) => {
	const token = event.cookies.get('gateqr_session');

	if (token) {
		try {
			const decoded = jwt.verify(token, JWT_SECRET) as {
				email: string;
				role: string;
				department_id: number | null;
			};
			event.locals.user = decoded;
		} catch (err) {
			// Invalid token
			event.locals.user = null;
			event.cookies.delete('gateqr_session', { path: '/' });
		}
	} else {
		event.locals.user = null;
	}

	const url = event.url.pathname;

	// Protect OSA routes
	if (url.startsWith('/osa')) {
		if (url.startsWith('/osa/dashboard') || url.startsWith('/osa/complaints')) {
			if (!event.locals.user || (event.locals.user.role !== 'osa' && event.locals.user.role !== 'security')) {
				throw redirect(303, '/login');
			}
		} else {
			if (!event.locals.user || event.locals.user.role !== 'osa') {
				throw redirect(303, '/login');
			}
		}
	}

	// Protect Dean routes
	if (url.startsWith('/dean')) {
		if (!event.locals.user || event.locals.user.role !== 'dean') {
			throw redirect(303, '/login');
		}
	}

	// Example: protect application status page for any logged in user
	if (url.startsWith('/status') && !event.locals.user) {
		throw redirect(303, '/login');
	}

	return await resolve(event);
};
