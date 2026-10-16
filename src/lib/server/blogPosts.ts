import { createClerkClient } from '@clerk/backend';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';

export interface BlogPost {
	slug: string;
	url: string;
	title: string;
	date: string;
	subtitle?: string;
	category?: string;
	tags: string[];
	series: string[];
	excerpt?: string;
}

const TOKEN_TTL_SECONDS = 3600;
const REFRESH_MARGIN_MS = 5 * 60_000;
let cached: { token: string; expiresAt: number } | null = null;

async function getM2MToken(machineSecretKey: string): Promise<string> {
	if (cached && cached.expiresAt - REFRESH_MARGIN_MS > Date.now()) return cached.token;
	const res = await createClerkClient({ machineSecretKey }).m2m.createToken({
		tokenFormat: 'jwt',
		secondsUntilExpiration: TOKEN_TTL_SECONDS
	});
	if (!res.token) throw new Error('Clerk returned no M2M token');
	cached = { token: res.token, expiresAt: res.expiration ?? Date.now() + TOKEN_TTL_SECONDS * 1000 };
	return cached.token;
}

export function resetBlogTokenCache(): void {
	cached = null;
}

/** Fetches recent published posts from the blog's M2M-protected feed; returns [] on any failure. */
export async function getRecentPosts(limit: number): Promise<BlogPost[]> {
	const machineSecretKey = env.CLERK_MACHINE_SECRET_KEY;
	if (!machineSecretKey) return [];

	try {
		const endpoint = new URL('/api/newsletter/posts', publicEnv.PUBLIC_BLOG_URL || 'https://hacker1db.dev');
		endpoint.searchParams.set('limit', String(limit));
		const res = await fetch(endpoint, {
			headers: { Authorization: `Bearer ${await getM2MToken(machineSecretKey)}` },
			redirect: 'error',
			signal: AbortSignal.timeout(3000)
		});
		if (res.status === 401) cached = null;
		if (!res.ok) {
			console.error(`Blog post feed request failed with status ${res.status}`);
			return [];
		}
		const data: { posts?: unknown } = await res.json();
		if (!Array.isArray(data.posts)) return [];
		return data.posts.filter((post): post is BlogPost => isSameOriginPost(post, endpoint.origin));
	} catch {
		console.error('Blog post feed request failed');
		return [];
	}
}

function isSameOriginPost(post: unknown, origin: string): boolean {
	if (typeof post !== 'object' || post === null) return false;
	const { title, url } = post as Record<string, unknown>;
	if (typeof title !== 'string' || typeof url !== 'string') return false;
	try {
		return new URL(url).origin === origin;
	} catch {
		return false;
	}
}
