import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from './env';
const sdk = vi.hoisted(() => ({
	handle: vi.fn(),
	configure: vi.fn(),
	signOut: vi.fn(),
	signIn: vi.fn()
}));
const db = vi.hoisted(() => ({ getConfirmedSubscribers: vi.fn(), getSubscriberCount: vi.fn() }));
const email = vi.hoisted(() => ({ sendNewsletterEmail: vi.fn() }));
vi.mock('@workos/authkit-sveltekit', () => ({
	configureAuthKit: sdk.configure,
	authKitHandle: () => sdk.handle,
	authKit: { signOut: sdk.signOut, getSignInUrl: sdk.signIn }
}));
vi.mock('$lib/server/db', () => db);
vi.mock('$lib/server/resend', () => email);
import { handle } from '../src/hooks.server';
import { isAdmin } from '../src/lib/server/auth';
import { actions, load } from '../src/routes/admin/+page.server';
import { actions as loginActions } from '../src/routes/login/+page.server';
import { POST as send } from '../src/routes/api/send/+server';
import { POST as logout } from '../src/routes/api/logout/+server';
const origin = 'https://newsletter.example.com';
function event(path = '/admin/', userId?: string) {
	return {
		url: new URL(path, origin),
		request: new Request(new URL(path, origin), {
			method: 'POST',
			headers: { origin, 'content-type': 'application/json' },
			body: JSON.stringify({ subject: 'News', htmlBody: '<p>News</p>' })
		}),
		locals: { userId, auth: { user: null, sessionId: undefined } },
		cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
	};
}
beforeEach(() => {
	vi.clearAllMocks();
	for (const key of Object.keys(env)) delete env[key];
	Object.assign(env, {
		ADMIN_USER_IDS: ' user_admin, user_other ',
		WORKOS_API_KEY: 'sk_test_fixture',
		WORKOS_CLIENT_ID: 'client_fixture',
		WORKOS_REDIRECT_URI: origin + '/auth/callback/',
		WORKOS_COOKIE_PASSWORD: 'test-only-cookie-password-32-characters'
	});
	sdk.handle.mockImplementation(async ({ event, resolve }) => {
		event.locals.auth = { user: { id: 'user_admin' }, sessionId: 'session_fixture' };
		return resolve(event);
	});
	db.getConfirmedSubscribers.mockResolvedValue([
		{ email: 'fixture@example.com', unsubscribeToken: 'fixture' }
	]);
	db.getSubscriberCount.mockResolvedValue(1);
	email.sendNewsletterEmail.mockResolvedValue({ sent: 1, failed: 0 });
	sdk.signOut.mockResolvedValue(
		new Response(null, {
			status: 302,
			headers: {
				Location:
					'https://api.workos.com/user_management/sessions/logout?session_id=session_fixture'
			}
		})
	);
	sdk.signIn.mockResolvedValue('https://api.workos.com/user_management/authorize');
});
describe('WorkOS integration boundaries (provider mocked)', () => {
	it('requires exact allowlisted WorkOS user IDs and denies an empty allowlist', () => {
		expect(isAdmin('user_admin')).toBe(true);
		expect(isAdmin('user_ad')).toBe(false);
		env.ADMIN_USER_IDS = '';
		expect(isAdmin('user_admin')).toBe(false);
	});
	it('does not process provider sessions on public requests', async () => {
		const e = event('/', 'stale');
		e.cookies.get.mockReturnValue('old-cookie');
		await handle({ event: e, resolve: async () => new Response() } as never);
		expect(sdk.handle).not.toHaveBeenCalled();
		expect(e.locals.userId).toBeUndefined();
	});
	it('maps verified provider identity to admin authorization and clears legacy cookies', async () => {
		const e = event();
		e.cookies.get.mockReturnValue('legacy');
		const response = await handle({ event: e, resolve: async () => new Response() } as never);
		expect(e.locals.userId).toBe('user_admin');
		expect(response.headers.get('cache-control')).toBe('private, no-store');
		expect(e.cookies.delete).toHaveBeenCalledWith('admin_session', { path: '/' });
	});
	it('denies non-admin provider users and removed admins', async () => {
		sdk.handle.mockImplementation(async ({ event, resolve }) => {
			event.locals.auth = { user: { id: 'user_stranger' } };
			return resolve(event);
		});
		const e = event();
		await handle({ event: e, resolve: async () => send(e as never) } as never);
		expect(e.locals.userId).toBeUndefined();
		expect(email.sendNewsletterEmail).not.toHaveBeenCalled();
		env.ADMIN_USER_IDS = '';
		expect(isAdmin('user_admin')).toBe(false);
	});
	it('fails closed without auth configuration while allowing public pages', async () => {
		delete env.WORKOS_API_KEY;
		const e = event('/api/send/', 'stale');
		const response = await handle({ event: e, resolve: async () => send(e as never) } as never);
		expect(response.status).toBe(401);
		expect(sdk.handle).not.toHaveBeenCalled();
	});
	it('starts hosted login with a fixed admin return path', async () => {
		await expect(loginActions.default!(event('/login/') as never)).rejects.toMatchObject({
			status: 303,
			location: 'https://api.workos.com/user_management/authorize'
		});
		expect(sdk.signIn).toHaveBeenCalledWith({ returnTo: '/admin/' });
	});
	it('ends the provider session and prevents a refresh from restoring the logout cookie', async () => {
		const e = event('/api/logout/');
		sdk.handle.mockImplementation(async ({ event, resolve }) => {
			event.locals.auth = { user: { id: 'user_admin' }, sessionId: 'session_fixture' };
			const response = await resolve(event);
			response.headers.append('Set-Cookie', 'wos-session=refreshed; Path=/; HttpOnly');
			return response;
		});
		const response = await handle({ event: e, resolve: async () => logout(e as never) } as never);
		expect(sdk.signOut).toHaveBeenCalledWith(e);
		expect(response.headers.get('location')).toContain(
			'https://api.workos.com/user_management/sessions/logout'
		);
		expect(response.headers.getSetCookie()).toEqual([]);
		expect(e.cookies.delete).toHaveBeenCalledWith('wos-session', { path: '/' });
	});
	it('rejects cross-origin logout without clearing the session', async () => {
		const e = event('/api/logout/');
		e.request.headers.set('origin', 'https://attacker.example');
		expect((await logout(e as never)).status).toBe(403);
		expect(sdk.signOut).not.toHaveBeenCalled();
		expect(e.cookies.delete).not.toHaveBeenCalled();
	});
	it('does not repeat side effects if the SDK retries resolve after an error', async () => {
		const e = event();
		const resolve = vi.fn().mockRejectedValue(new Error('response failure'));
		sdk.handle.mockImplementation(async ({ event, resolve }) => {
			try {
				return await resolve(event);
			} catch {
				return resolve(event);
			}
		});
		await expect(handle({ event: e, resolve } as never)).rejects.toThrow('response failure');
		expect(resolve).toHaveBeenCalledTimes(1);
	});
});
describe('authenticated newsletter routes', () => {
	it.each([undefined, 'user_stranger'])(
		'blocks unauthorized actions before side effects (%s)',
		async (userId) => {
			const e = event('/admin/', userId);
			expect(await actions.send!(e as never)).toMatchObject({ status: 401 });
			expect((await send(e as never)).status).toBe(401);
			await expect(load(e as never)).rejects.toMatchObject({ status: 302, location: '/login/' });
			expect(db.getConfirmedSubscribers).not.toHaveBeenCalled();
		}
	);
	it('loads the authenticated subscriber count', async () => {
		expect(await load(event('/admin/', 'user_admin') as never)).toEqual({ subscriberCount: 1 });
	});
	it('sends through both form and JSON routes using the same service', async () => {
		const e = event('/api/send/', 'user_admin');
		expect(await (await send(e as never)).json()).toEqual({ sent: 1, failed: 0 });
		const form = new FormData();
		form.set('subject', 'News');
		form.set('htmlBody', '<p>News</p>');
		e.request = new Request(new URL('/admin/', origin), { method: 'POST', body: form });
		expect(await actions.send!(e as never)).toEqual({ sent: 1, failed: 0 });
		expect(email.sendNewsletterEmail).toHaveBeenCalledTimes(2);
	});
	it('returns no-subscriber and provider failures without leaking errors', async () => {
		db.getConfirmedSubscribers.mockResolvedValue([]);
		const e = event('/api/send/', 'user_admin');
		expect(await (await send(e as never)).json()).toEqual({ error: 'No confirmed subscribers.' });
		db.getConfirmedSubscribers.mockRejectedValue(new Error('sensitive database detail'));
		const response = await send(event('/api/send/', 'user_admin') as never);
		expect(response.status).toBe(500);
		expect(await response.json()).toEqual({ error: 'Failed to send newsletter.' });
	});
	it('rejects cross-origin, missing-origin, invalid JSON and empty content', async () => {
		for (const header of ['https://attacker.example', null]) {
			const e = event('/api/send/', 'user_admin');
			if (header) e.request.headers.set('origin', header);
			else e.request.headers.delete('origin');
			expect((await send(e as never)).status).toBe(403);
		}
		for (const body of ['invalid', 'null', '{}']) {
			const e = event('/api/send/', 'user_admin');
			e.request = new Request(e.url, { method: 'POST', headers: { origin }, body });
			expect((await send(e as never)).status).toBe(400);
		}
		expect(email.sendNewsletterEmail).not.toHaveBeenCalled();
	});
});
