import { createClerkClient, verifyToken } from '@clerk/backend';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

export function isAdmin(userId: string | undefined): boolean {
	const admins = (env.ADMIN_USER_IDS ?? '').split(',').map((id) => id.trim()).filter(Boolean);
	return !!userId && admins.includes(userId);
}

export async function verifyAdminToken(token: string | undefined): Promise<{ userId: string; sessionId: string; expiresAt: number } | null> {
	if (!token || !env.ADMIN_USER_IDS?.trim() || (!env.CLERK_SECRET_KEY && !env.CLERK_JWT_KEY)) return null;
	const authorizedParties = (env.CLERK_AUTHORIZED_PARTIES ?? 'https://newsletter.hacker1db.dev')
		.split(',').map((origin) => origin.trim()).filter(Boolean);
	if (!authorizedParties.length) return null;
	try {
		const payload = await verifyToken(token, {
			secretKey: env.CLERK_SECRET_KEY,
			jwtKey: env.CLERK_JWT_KEY,
			authorizedParties,
			clockSkewInMs: 0
		});
		if (!isAdmin(payload.sub) || typeof payload.sid !== 'string' || !payload.sid ||
			payload.sts === 'pending' || !Number.isFinite(payload.exp) || payload.exp <= Date.now() / 1000) return null;
		return { userId: payload.sub, sessionId: payload.sid, expiresAt: payload.exp };
	} catch {
		// Invalid tokens and unavailable verification fail closed; never log credentials.
		return null;
	}
}

const SESSION_DURATION_SECONDS = 8 * 60 * 60;

function sessionSignature(payload: string): Buffer {
	if (!env.CLERK_SECRET_KEY) throw new Error('CLERK_SECRET_KEY must be set');
	return createHmac('sha256', env.CLERK_SECRET_KEY)
		.update(`newsletter-admin-session-v1:${payload}`).digest();
}

// Only a currently verified Clerk JWT can be exchanged for this server-session token.
export async function createAdminSession(token: string): Promise<{ token: string; expiresAt: number } | null> {
	const admin = await verifyAdminToken(token);
	if (!admin || !env.CLERK_SECRET_KEY) return null;
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
	const payload = Buffer.from(JSON.stringify({ v: 1, sub: admin.userId, sid: admin.sessionId, exp: expiresAt }))
		.toString('base64url');
	const sessionToken = `${payload}.${sessionSignature(payload).toString('base64url')}`;
	if (!await verifyAdminSession(sessionToken)) return null;
	return { token: sessionToken, expiresAt };
}

export async function verifyAdminSession(token: string | undefined): Promise<{ userId: string } | null> {
	if (!token || !env.CLERK_SECRET_KEY) return null;
	try {
		const parts = token.split('.');
		if (parts.length !== 2) return null;
		const [payload, signature] = parts;
		const expected = sessionSignature(payload);
		const received = Buffer.from(signature, 'base64url');
		if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
		const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (claims.v !== 1 || typeof claims.sub !== 'string' || !isAdmin(claims.sub) ||
			typeof claims.sid !== 'string' || !claims.sid || !Number.isFinite(claims.exp) ||
			claims.exp <= Date.now() / 1000) return null;
		// No cached authorization: revocation, expiry and allowlist changes take effect each request.
		const session = await createClerkClient({ secretKey: env.CLERK_SECRET_KEY }).sessions.getSession(claims.sid);
		if (session.id !== claims.sid || session.userId !== claims.sub || session.status !== 'active' ||
			!Number.isFinite(session.expireAt) || session.expireAt <= Date.now()) return null;
		return { userId: claims.sub };
	} catch {
		return null;
	}
}
