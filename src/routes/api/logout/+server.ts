import { authKit } from '@workos/authkit-sveltekit';
import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
export const POST: RequestHandler = async (event) => {
	if (event.request.headers.get('origin') !== event.url.origin)
		return new Response('Forbidden', { status: 403 });
	event.cookies.delete('admin_session', { path: '/' });
	event.cookies.delete('wos-session', { path: '/' });
	if (!event.locals.auth?.sessionId) redirect(303, '/login/');
	// Redirect through WorkOS to end the provider session as well as the local cookie.
	return authKit.signOut(event);
};
