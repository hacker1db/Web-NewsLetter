import { generateKeyPairSync, sign } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './env';
const { getSession } = vi.hoisted(() => ({ getSession: vi.fn() }));
vi.mock('@clerk/backend', async (importOriginal) => ({
	...await importOriginal<typeof import('@clerk/backend')>(),
	createClerkClient: vi.fn(() => ({ sessions: { getSession } }))
}));
vi.mock('$lib/server/db', () => ({ getConfirmedSubscribers: vi.fn(async () => []) }));
import { createAdminSession, isAdmin, verifyAdminSession, verifyAdminToken } from '../src/lib/server/auth';
import { handle } from '../src/hooks.server';
import { POST as login } from '../src/routes/api/auth/+server';
import { POST as send } from '../src/routes/api/send/+server';
import { actions, load as adminLoad } from '../src/routes/admin/+page.server';

const origin = 'https://newsletter.hacker1db.dev';
const keys = generateKeyPairSync('rsa', { modulusLength: 2048 });
const wrongKeys = generateKeyPairSync('rsa', { modulusLength: 2048 });

function token(overrides: Record<string, unknown> = {}, key = keys.privateKey) {
	const now = Math.floor(Date.now() / 1000);
	const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid: 'test' })).toString('base64url');
	const payload = Buffer.from(JSON.stringify({
		sub: 'user_admin', sid: 'sess_test', iss: 'https://test.clerk.accounts.dev',
		azp: origin, iat: now - 1, nbf: now - 1, exp: now + 60, ...overrides
	})).toString('base64url');
	const input = `${header}.${payload}`;
	return `${input}.${sign('RSA-SHA256', Buffer.from(input), key).toString('base64url')}`;
}

function event(body: unknown = {}, userId?: string) {
	return {
		request: new Request(`${origin}/api/auth/`, {
			method: 'POST', headers: { 'content-type': 'application/json', origin }, body: JSON.stringify(body)
		}),
		url: new URL(`${origin}/api/auth/`), locals: { userId },
		cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
	};
}

beforeEach(() => {
	for (const name of Object.keys(env)) delete env[name];
	env.ADMIN_USER_IDS = ' user_admin, user_other ';
	env.CLERK_SECRET_KEY = 'test-only-generated-session-signing-key';
	env.CLERK_JWT_KEY = keys.publicKey.export({ type: 'spki', format: 'pem' }).toString();
	getSession.mockReset().mockImplementation(async () => ({
		id: 'sess_test', userId: 'user_admin', status: 'active', expireAt: Date.now() + 86400000
	}));
});

afterEach(() => vi.useRealTimers());

describe('real Clerk JWT verification', () => {
	it('accepts only a signed, current allowlisted session', async () => {
		expect(await verifyAdminToken(token())).toMatchObject({ userId: 'user_admin' });
		expect(isAdmin('user_ad')).toBe(false);
	});
	it.each(['', ' ', ','])('denies an empty admin allowlist (%j)', async (value) => {
		env.ADMIN_USER_IDS = value;
		expect(await verifyAdminToken(token())).toBeNull();
	});
	it('denies missing allowlist or verification credentials', async () => {
		delete env.ADMIN_USER_IDS;
		expect(await verifyAdminToken(token())).toBeNull();
		env.ADMIN_USER_IDS = 'user_admin';
		delete env.CLERK_JWT_KEY;
		delete env.CLERK_SECRET_KEY;
		expect(await verifyAdminToken(token())).toBeNull();
	});
	it.each([
		{ sub: 'user_not_admin' }, { exp: 1 }, { nbf: 9999999999 },
		{ iat: 9999999999 }, { azp: 'https://attacker.example' }, { azp: undefined },
		{ sid: undefined }, { sid: '' }, { sts: 'pending' }
	])('rejects invalid claims %j', async (claims) => {
		expect(await verifyAdminToken(token(claims))).toBeNull();
	});
	it('rejects arbitrary cookies, unsigned tokens, tampering and another signing key', async () => {
		expect(await verifyAdminToken('user_admin')).toBeNull();
		const valid = token();
		const [header, payload] = valid.split('.');
		expect(await verifyAdminToken(`${header}.${payload}.`)).toBeNull();
		const changed = Buffer.from(JSON.stringify({ sub: 'user_other' })).toString('base64url');
		expect(await verifyAdminToken(`${header}.${changed}.${valid.split('.')[2]}`)).toBeNull();
		expect(await verifyAdminToken(token({}, wrongKeys.privateKey))).toBeNull();
	});
});

describe('request boundaries', () => {
	it('exchanges a verified JWT for a signed HttpOnly server session', async () => {
		const jwt = token();
		const e = event({ token: jwt });
		expect((await login(e as never)).status).toBe(200);
		expect(e.cookies.set).toHaveBeenCalledWith('admin_session', expect.any(String), expect.objectContaining({
			httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: expect.any(Number)
		}));
		const cookie = e.cookies.set.mock.calls[0];
		expect(cookie[1]).not.toBe(jwt);
		expect(cookie[2].maxAge).toBeLessThanOrEqual(8 * 60 * 60);
		expect(await verifyAdminSession(cookie[1])).toEqual({ userId: 'user_admin' });
	});
	it('denies an unapproved signed user and clears the cookie', async () => {
		const e = event({ token: token({ sub: 'user_not_admin' }) });
		expect((await login(e as never)).status).toBe(401);
		expect(e.cookies.set).not.toHaveBeenCalled();
		expect(e.cookies.delete).toHaveBeenCalled();
	});
	it('rechecks Clerk each request and removes revoked/forged cookies', async () => {
		const e = event({}, 'stale_user');
		const resolve = vi.fn(async () => new Response());
		const session = await createAdminSession(token());
		e.cookies.get.mockReturnValue(session!.token);
		await handle({ event: e, resolve } as never);
		expect(e.locals.userId).toBe('user_admin');
		getSession.mockResolvedValue({ id: 'sess_test', userId: 'user_admin', status: 'revoked', expireAt: Date.now() + 86400000 });
		await handle({ event: e, resolve } as never);
		expect(e.locals.userId).toBeUndefined();
		expect(e.cookies.delete).toHaveBeenCalledWith('admin_session', { path: '/' });
	});
	it('keeps admin interactions authenticated past the original JWT expiry without accepting expired JWTs', async () => {
		vi.useFakeTimers();
		const jwt = token();
		const session = await createAdminSession(jwt);
		vi.setSystemTime(Date.now() + 120000);
		expect(await verifyAdminToken(jwt)).toBeNull();
		expect(await createAdminSession(jwt)).toBeNull();
		const e = event();
		e.cookies.get.mockReturnValue(session!.token);
		await handle({ event: e, resolve: async () => new Response() } as never);
		expect(e.locals.userId).toBe('user_admin');
		const form = new FormData();
		form.set('subject', 'Test');
		form.set('htmlBody', '<p>Test</p>');
		e.request = new Request(`${origin}/admin/`, { method: 'POST', body: form });
		expect(await actions.send!(e as never)).toMatchObject({ status: 400, data: { error: 'No confirmed subscribers.' } });
		vi.setSystemTime(Date.now() + 8 * 60 * 60 * 1000);
		expect(await verifyAdminSession(session!.token)).toBeNull();
	});
	it('denies tampered cookies, mismatched users, removed admins, and Clerk outages', async () => {
		const session = await createAdminSession(token());
		expect(await verifyAdminSession('user_admin')).toBeNull();
		expect(await verifyAdminSession(`A${session!.token.slice(1)}`)).toBeNull();
		getSession.mockResolvedValue({ id: 'sess_test', userId: 'user_other', status: 'active', expireAt: Date.now() + 86400000 });
		expect(await verifyAdminSession(session!.token)).toBeNull();
		getSession.mockRejectedValue(new Error('Service unavailable'));
		expect(await verifyAdminSession(session!.token)).toBeNull();
		env.ADMIN_USER_IDS = '';
		expect(await verifyAdminSession(session!.token)).toBeNull();
	});
	it.each([undefined, 'user_not_admin'])('denies direct actions/API/data loads before side effects (%j)', async (userId) => {
		const e = event({}, userId);
		const read = vi.spyOn(e.request, 'formData');
		expect((await actions.send!(e as never))?.status).toBe(401);
		expect((await send(e as never)).status).toBe(401);
		expect(read).not.toHaveBeenCalled();
		await expect(adminLoad(e as never)).rejects.toMatchObject({ status: 302, location: '/login/' });
	});
	it('rejects cross-origin cookie login/send requests', async () => {
		const e = event({ token: token() }, 'user_admin');
		e.request.headers.set('origin', 'https://attacker.example');
		expect((await login(e as never)).status).toBe(403);
		expect((await send(e as never)).status).toBe(403);
	});
});
