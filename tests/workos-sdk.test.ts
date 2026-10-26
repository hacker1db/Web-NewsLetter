import { beforeAll, expect, it, vi } from 'vitest';
import { env } from './env';
import { handle } from '../src/hooks.server';
import { authKit } from '@workos/authkit-sveltekit';
import { GET as callback } from '../src/routes/auth/callback/+server';
const origin = 'https://newsletter.example.com';
beforeAll(() => {
	Object.assign(env, {
		ADMIN_USER_IDS: 'user_fixture',
		WORKOS_API_KEY: 'sk_test_fixture',
		WORKOS_CLIENT_ID: 'client_fixture',
		WORKOS_REDIRECT_URI: origin + '/auth/callback/',
		WORKOS_COOKIE_PASSWORD: 'test-only-cookie-password-at-least-32-characters'
	});
});
function event(path: string, cookie = '') {
	return {
		url: new URL(path, origin),
		request: new Request(new URL(path, origin), { headers: { cookie } }),
		locals: { auth: { user: null }, userId: undefined },
		cookies: { get: vi.fn(), set: vi.fn(), delete: vi.fn() }
	};
}
it('real SDK creates a PKCE/state-bound hosted login and secure verifier cookie', async () => {
	const e = event('/auth/sign-in/');
	const response = await handle({
		event: e,
		resolve: async () =>
			new Response(null, {
				status: 302,
				headers: { Location: await authKit.getSignInUrl({ returnTo: '/admin/' }) }
			})
	} as never);
	const url = new URL(response.headers.get('location')!);
	expect(url.origin).toBe('https://api.workos.com');
	expect(url.searchParams.get('client_id')).toBe('client_fixture');
	expect(url.searchParams.get('redirect_uri')).toBe(origin + '/auth/callback/');
	expect(url.searchParams.get('code_challenge_method')).toBe('S256');
	expect(url.searchParams.get('state')).toBeTruthy();
	expect(e.cookies.set).toHaveBeenCalledWith(
		expect.any(String),
		expect.any(String),
		expect.objectContaining({ httpOnly: true, secure: true, sameSite: 'lax', path: '/' })
	);
});
it('real SDK rejects a forged session without granting admin identity', async () => {
	const e = event('/admin/', 'wos-session=forged');
	await handle({ event: e, resolve: async () => new Response() } as never);
	expect(e.locals.auth.user).toBeNull();
	expect(e.locals.userId).toBeUndefined();
});
it('real callback rejects missing authorization code without exchanging credentials', async () => {
	const e = event('/auth/callback/');
	const response = await handle({ event: e, resolve: async () => callback(e as never) } as never);
	expect(response.status).toBe(302);
	expect(response.headers.get('location')).toBe('/auth/error?code=AUTH_FAILED');
	expect(e.cookies.set).not.toHaveBeenCalled();
});
