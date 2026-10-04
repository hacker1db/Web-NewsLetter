import type { Handle } from '@sveltejs/kit';
import { verifyAdminSession } from '$lib/server/auth';

const authHandle: Handle = async ({ event, resolve }) => {
	delete event.locals.userId;
	const token = event.cookies.get('admin_session');
	const admin = await verifyAdminSession(token);
	if (admin) {
		event.locals.userId = admin.userId;
	} else if (token) {
		event.cookies.delete('admin_session', { path: '/' });
	}
	return resolve(event);
};

export const handle = authHandle;
