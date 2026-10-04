import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { createAdminSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, cookies, url }) => {
	if (request.headers.has('origin') && request.headers.get('origin') !== url.origin) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	let token: string;
	try {
		const body = await request.json();
		if (typeof body?.token !== 'string' || !body.token) {
			return json({ error: 'Missing token' }, { status: 400 });
		}
		token = body.token;
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
	const admin = await createAdminSession(token);
	if (!admin) {
		cookies.delete('admin_session', { path: '/' });
		return json({ error: 'Unauthorized' }, { status: 401 });
	}
	cookies.set('admin_session', admin.token, {
		httpOnly: true,
		secure: true,
		path: '/',
		sameSite: 'lax',
		maxAge: Math.max(0, Math.floor(admin.expiresAt - Date.now() / 1000))
	});
	return json({ success: true });
};
