import { expect, it } from 'vitest';
import { vi } from 'vitest';
vi.mock('$lib/server/auth', () => ({ verifyAdminSession: vi.fn(async () => null) }));
import { handle } from '../src/hooks.server';
import { CLERK_UI_VERSION, clerkFrontendApiHost, cspDirectives } from '../src/lib/csp.js';

const key = `pk_live_${Buffer.from('clerk.newsletter.hacker1db.dev$').toString('base64')}`;

function event() {
	return { cookies: { get: vi.fn(), delete: vi.fn() }, locals: {} };
}

it('adds anti-framing, nosniff, and referrer headers to every response', async () => {
	const response = await handle({ event: event(), resolve: async () => new Response('ok') } as never);
	expect(response.headers.get('x-frame-options')).toBe('DENY');
	expect(response.headers.get('x-content-type-options')).toBe('nosniff');
	expect(response.headers.get('referrer-policy')).toBe('strict-origin-when-cross-origin');
});

it('adds headers to responses with immutable headers', async () => {
	const immutable = Response.redirect('https://newsletter.hacker1db.dev/login/', 302);
	const response = await handle({ event: event(), resolve: async () => immutable } as never);
	expect(response.status).toBe(302);
	expect(response.headers.get('x-frame-options')).toBe('DENY');
});

it('derives the Clerk Frontend API host from the publishable key', () => {
	expect(clerkFrontendApiHost(key)).toBe('clerk.newsletter.hacker1db.dev');
	expect(clerkFrontendApiHost(undefined)).toBeNull();
	expect(clerkFrontendApiHost('pk_live_!!!')).toBeNull();
	expect(clerkFrontendApiHost(`pk_live_${Buffer.from("evil.example/'; script-src *$").toString('base64')}`)).toBeNull();
});

it('CSP blocks framing and limits scripts to self, Clerk, and Turnstile', () => {
	const csp = cspDirectives(key);
	expect(csp['frame-ancestors']).toEqual(['none']);
	expect(csp['object-src']).toEqual(['none']);
	expect(csp['script-src']).toEqual(['self', 'https://clerk.newsletter.hacker1db.dev', 'https://challenges.cloudflare.com']);
	expect(csp['script-src']).not.toContain('unsafe-inline');
	expect(csp['connect-src']).toContain('https://clerk.newsletter.hacker1db.dev');
	expect(cspDirectives(undefined)['script-src']).toEqual(['self', 'https://challenges.cloudflare.com']);
});

it('pins an exact @clerk/ui version', () => {
	expect(CLERK_UI_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
});
