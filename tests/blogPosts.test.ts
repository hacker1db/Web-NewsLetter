import { beforeEach, expect, it, vi } from 'vitest';
import { env } from './env';
const { createToken } = vi.hoisted(() => ({ createToken: vi.fn() }));
vi.mock('@clerk/backend', () => ({ createClerkClient: vi.fn(() => ({ m2m: { createToken } })) }));
import { getRecentPosts, resetBlogTokenCache } from '../src/lib/server/blogPosts';

const post = { slug: 'a/b', url: 'https://hacker1db.dev/posts/a/b/', title: 'B', date: '2026-01-01', tags: [], series: [] };
const fetchMock = vi.fn();

beforeEach(() => {
	for (const key of Object.keys(env)) delete env[key];
	env.CLERK_MACHINE_SECRET_KEY = 'ak_test';
	resetBlogTokenCache();
	createToken.mockReset();
	createToken.mockResolvedValue({ token: 'test-only-jwt', expiration: Date.now() + 3_600_000 });
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

it('skips the request when no machine secret key is configured', async () => {
	delete env.CLERK_MACHINE_SECRET_KEY;
	expect(await getRecentPosts(3)).toEqual([]);
	expect(fetchMock).not.toHaveBeenCalled();
});

it('requests the feed with the bearer token and returns its posts', async () => {
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ posts: [post] }), { status: 200 }));
	expect(await getRecentPosts(3)).toEqual([post]);
	const [url, init] = fetchMock.mock.calls[0];
	expect(String(url)).toBe('https://hacker1db.dev/api/newsletter/posts?limit=3');
	expect(init.headers).toEqual({ Authorization: 'Bearer test-only-jwt' });
	expect(init.redirect).toBe('error');
	expect(createToken).toHaveBeenCalledWith({ tokenFormat: 'jwt', secondsUntilExpiration: 3600 });
});

it('reuses the cached token and re-mints when under 5 minutes remain', async () => {
	fetchMock.mockImplementation(async () => new Response(JSON.stringify({ posts: [] }), { status: 200 }));
	await getRecentPosts(3);
	await getRecentPosts(3);
	expect(createToken).toHaveBeenCalledTimes(1);
	createToken.mockResolvedValue({ token: 'second-jwt', expiration: Date.now() + 4 * 60_000 });
	resetBlogTokenCache();
	await getRecentPosts(3);
	await getRecentPosts(3);
	expect(createToken).toHaveBeenCalledTimes(3);
	expect(fetchMock.mock.calls[3][1].headers.Authorization).toBe('Bearer second-jwt');
});

it('uses PUBLIC_BLOG_URL when set', async () => {
	env.PUBLIC_BLOG_URL = 'https://blog.example.test';
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
	await getRecentPosts(3);
	expect(String(fetchMock.mock.calls[0][0])).toBe('https://blog.example.test/api/newsletter/posts?limit=3');
});

it.each([
	['an unauthorized response', () => fetchMock.mockResolvedValue(new Response('{}', { status: 401 }))],
	['a malformed body', () => fetchMock.mockResolvedValue(new Response('{"posts":"nope"}', { status: 200 }))],
	['a token mint failure', () => createToken.mockRejectedValue(new Error('clerk down'))],
	['a network failure', () => fetchMock.mockRejectedValue(new Error('offline'))]
])('returns [] on %s', async (_label, arrange) => {
	vi.spyOn(console, 'error').mockImplementation(() => {});
	arrange();
	expect(await getRecentPosts(3)).toEqual([]);
});

it('drops posts whose url is not on the blog origin', async () => {
	const bad = [{ ...post, url: 'javascript:alert(1)' }, { ...post, url: 'https://evil.example/x' }, { ...post, title: 1 }];
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ posts: [post, ...bad] }), { status: 200 }));
	expect(await getRecentPosts(3)).toEqual([post]);
});

it('tolerates a trailing slash in PUBLIC_BLOG_URL', async () => {
	env.PUBLIC_BLOG_URL = 'https://hacker1db.dev/';
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ posts: [] }), { status: 200 }));
	await getRecentPosts(3);
	expect(String(fetchMock.mock.calls[0][0])).toBe('https://hacker1db.dev/api/newsletter/posts?limit=3');
});
