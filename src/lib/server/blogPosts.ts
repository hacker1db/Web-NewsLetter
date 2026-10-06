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

/** Fetches recent published posts from the blog's token-protected feed; returns [] on any failure. */
export async function getRecentPosts(limit: number): Promise<BlogPost[]> {
	const token = env.NEWSLETTER_POSTS_API_TOKEN;
	if (!token) return [];

	try {
		const endpoint = new URL('/api/newsletter/posts', publicEnv.PUBLIC_BLOG_URL || 'https://hacker1db.dev');
		endpoint.searchParams.set('limit', String(limit));
		const res = await fetch(endpoint, {
			headers: { Authorization: `Bearer ${token}` },
			redirect: 'error',
			signal: AbortSignal.timeout(3000)
		});
		if (!res.ok) {
			console.error(`Blog post feed request failed with status ${res.status}`);
			return [];
		}
		const data: { posts?: unknown } = await res.json();
		if (!Array.isArray(data.posts)) return [];
		return data.posts.filter((post): post is BlogPost => isSameOriginPost(post, endpoint.origin));
	} catch {
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
