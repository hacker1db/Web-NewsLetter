import type { Handle } from '@sveltejs/kit';
import { verifyAdminSession } from '$lib/server/auth';

// The Content-Security-Policy (including frame-ancestors) comes from kit.csp in
// svelte.config.js; these headers cover the rest, including older browsers.
export const SECURITY_HEADERS: Record<string, string> = {
	'X-Frame-Options': 'DENY',
	'X-Content-Type-Options': 'nosniff',
	'Referrer-Policy': 'strict-origin-when-cross-origin'
};

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

function withSecurityHeaders(response: Response): Response {
	const missing = Object.entries(SECURITY_HEADERS).filter(([name]) => !response.headers.has(name));
	if (!missing.length) return response;
	try {
		for (const [name, value] of missing) response.headers.set(name, value);
		return response;
	} catch {
		// Redirect and fetched responses can have immutable headers.
		const copy = new Response(response.body, response);
		for (const [name, value] of missing) copy.headers.set(name, value);
		return copy;
	}
}

export const handle: Handle = async (input) => withSecurityHeaders(await authHandle(input));
