import { beforeEach, expect, it, vi } from 'vitest';
import { env } from './env';
import { getRecentPosts } from '../src/lib/server/blogPosts';

const post = { slug: 'a/b', url: 'https://hacker1db.dev/posts/a/b/', title: 'B', date: '2026-01-01', tags: [], series: [] };
const fetchMock = vi.fn();

beforeEach(() => {
	for (const key of Object.keys(env)) delete env[key];
	env.NEWSLETTER_POSTS_API_TOKEN = 'test-only-token';
	fetchMock.mockReset();
	vi.stubGlobal('fetch', fetchMock);
});

it('skips the request when no token is configured', async () => {
	delete env.NEWSLETTER_POSTS_API_TOKEN;
	expect(await getRecentPosts(3)).toEqual([]);
	expect(fetchMock).not.toHaveBeenCalled();
});

it('requests the feed with the bearer token and returns its posts', async () => {
	fetchMock.mockResolvedValue(new Response(JSON.stringify({ posts: [post] }), { status: 200 }));
	expect(await getRecentPosts(3)).toEqual([post]);
	const [url, init] = fetchMock.mock.calls[0];
	expect(String(url)).toBe('https://hacker1db.dev/api/newsletter/posts?limit=3');
	expect(init.headers).toEqual({ Authorization: 'Bearer test-only-token' });
	expect(init.redirect).toBe('error');
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
