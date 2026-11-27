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

const MIN_SESSION_SECRET_LENGTH = 32;

/** The admin-cookie HMAC key. It is separate from Clerk's API key; missing or short fails closed. */
function sessionSecret(): string | null {
	const secret = env.ADMIN_SESSION_SECRET;
	return secret && secret.length >= MIN_SESSION_SECRET_LENGTH ? secret : null;
}

function sessionSignature(payload: string, secret: string): Buffer {
	return createHmac('sha256', secret).update(`newsletter-admin-session-v1:${payload}`).digest();
}

type SessionClaims = { sub: string; sid: string; exp: number };

/** Checks the cookie's signature and shape only; callers decide what else must hold. */
function readSessionClaims(token: string | undefined): SessionClaims | null {
	const secret = sessionSecret();
	if (!token || !secret) return null;
	try {
		const parts = token.split('.');
		if (parts.length !== 2) return null;
		const [payload, signature] = parts;
		const expected = sessionSignature(payload, secret);
		const received = Buffer.from(signature, 'base64url');
		if (received.length !== expected.length || !timingSafeEqual(received, expected)) return null;
		const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
		if (claims.v !== 1 || typeof claims.sub !== 'string' || typeof claims.sid !== 'string' || !claims.sid ||
			!Number.isFinite(claims.exp)) return null;
		return { sub: claims.sub, sid: claims.sid, exp: claims.exp };
	} catch {
		return null;
	}
}

// Only a currently verified Clerk JWT can be exchanged for this server-session token.
export async function createAdminSession(token: string): Promise<{ token: string; expiresAt: number } | null> {
	const secret = sessionSecret();
	if (!secret) return null;
	const admin = await verifyAdminToken(token);
	if (!admin || !env.CLERK_SECRET_KEY) return null;
	const expiresAt = Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS;
	const payload = Buffer.from(JSON.stringify({ v: 1, sub: admin.userId, sid: admin.sessionId, exp: expiresAt }))
		.toString('base64url');
	const sessionToken = `${payload}.${sessionSignature(payload, secret).toString('base64url')}`;
	if (!await verifyAdminSession(sessionToken)) return null;
	return { token: sessionToken, expiresAt };
}

export async function verifyAdminSession(token: string | undefined): Promise<{ userId: string } | null> {
	if (!env.CLERK_SECRET_KEY) return null;
	const claims = readSessionClaims(token);
	if (!claims || !isAdmin(claims.sub) || claims.exp <= Date.now() / 1000) return null;
	try {
		// No cached authorization: revocation, expiry and allowlist changes take effect each request.
		const session = await createClerkClient({ secretKey: env.CLERK_SECRET_KEY }).sessions.getSession(claims.sid);
		if (session.id !== claims.sid || session.userId !== claims.sub || session.status !== 'active' ||
			!Number.isFinite(session.expireAt) || session.expireAt <= Date.now()) return null;
		return { userId: claims.sub };
	} catch {
		return null;
	}
}

/**
 * Revokes the Clerk session behind a validly signed admin cookie, so logging out here
 * also ends the Clerk sign-in. Returns false when nothing was revoked; never throws.
 */
export async function revokeAdminSession(token: string | undefined): Promise<boolean> {
	if (!env.CLERK_SECRET_KEY) return false;
	const claims = readSessionClaims(token);
	if (!claims) return false;
	try {
		const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });
		const session = await clerk.sessions.getSession(claims.sid);
		// Only revoke the session the cookie was issued for.
		if (session.id !== claims.sid || session.userId !== claims.sub) return false;
		await clerk.sessions.revokeSession(claims.sid);
		return true;
	} catch {
		return false;
	}
}
