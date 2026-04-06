import { json } from '@sveltejs/kit';
import type { RequestHandler } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

interface TokenPayload {
	sid: string;
	sub: string;
	iss: string;
	exp: number;
}

interface ClerkSession {
	status: string;
	user_id: string;
}

export const POST: RequestHandler = async ({ request, cookies }) => {
	let token: string;

	try {
		const body = (await request.json()) as { token?: unknown };
		if (typeof body.token !== 'string' || !body.token) {
			return json({ error: 'Missing token' }, { status: 400 });
		}
		token = body.token;
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}

	// Decode JWT payload — JWT uses base64url; convert to standard base64 first
	let payload: TokenPayload;
	try {
		const parts = token.split('.');
		if (parts.length !== 3) throw new Error('Malformed JWT');
		const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
		payload = JSON.parse(Buffer.from(base64, 'base64').toString('utf-8')) as TokenPayload;
		if (!payload.sid || !payload.sub) throw new Error('Missing claims');
	} catch {
		return json({ error: 'Invalid token format' }, { status: 401 });
	}

	// Verify session is active via Clerk REST API using the secret key
	let session: ClerkSession;
	try {
		const res = await fetch(`https://api.clerk.com/v1/sessions/${payload.sid}`, {
			headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` }
		});

		if (!res.ok) {
			return json({ error: 'Session not found' }, { status: 401 });
		}

		session = (await res.json()) as ClerkSession;
	} catch {
		return json({ error: 'Failed to verify session' }, { status: 500 });
	}

	if (session.status !== 'active') {
		return json({ error: 'Session is not active' }, { status: 401 });
	}

	// Set HttpOnly session cookie valid for 7 days
	cookies.set('admin_session', session.user_id, {
		httpOnly: true,
		secure: true,
		path: '/',
		sameSite: 'lax',
		maxAge: 60 * 60 * 24 * 7
	});

	return json({ success: true });
};
