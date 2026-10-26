import type { Handle } from '@sveltejs/kit';
import { authConfigured, getAuthHandler, isAdmin } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
	delete event.locals.userId;
	event.locals.auth = { user: null };
	const path = event.url.pathname.replace(/\/$/, '');
	const protectedRoute =
		path === '/admin' ||
		path.startsWith('/admin/') ||
		['/login', '/auth/callback', '/auth/sign-in', '/api/logout', '/api/send'].includes(path);
	// Public pages never decrypt sessions or contact the identity provider.
	if (!protectedRoute) return resolve(event);
	if (event.cookies.get('admin_session')) event.cookies.delete('admin_session', { path: '/' });
	if (!authConfigured()) return resolve(event);
	// The SDK's error handler can call resolve again. Never repeat a send side effect.
	let response: Promise<Response> | undefined;
	const result = await getAuthHandler()({
		event,
		resolve: (authenticatedEvent) => {
			if (!response) {
				const id = authenticatedEvent.locals.auth.user?.id;
				if (isAdmin(id)) authenticatedEvent.locals.userId = id;
				response = Promise.resolve().then(() => resolve(authenticatedEvent));
			}
			return response;
		}
	});
	result.headers.set('Cache-Control', 'private, no-store');
	if (path === '/api/logout' && event.request.method === 'POST' && result.status < 400) {
		// Do not let a token refresh in the SDK restore a session during logout.
		const cookies = result.headers
			.getSetCookie()
			.filter((cookie) => !cookie.startsWith('wos-session='));
		result.headers.delete('Set-Cookie');
		for (const cookie of cookies) result.headers.append('Set-Cookie', cookie);
		event.cookies.delete('wos-session', { path: '/' });
	}
	return result;
};
