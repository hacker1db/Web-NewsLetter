import type { Handle } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';

const authHandle: Handle = async ({ event, resolve }) => {
	const userId = event.cookies.get('admin_session');
	if (userId) {
		event.locals.userId = userId;
	}
	return resolve(event);
};

export const handle = sequence(authHandle);
