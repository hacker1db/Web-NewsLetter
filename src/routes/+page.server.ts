import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	let posts: Array<{ title: string; slug: string; date: string; tags?: string[] }> = [];
	try {
		const res = await fetch('https://hacker1db.dev/api/posts.json', {
			signal: AbortSignal.timeout(3000)
		});
		if (res.ok) {
			const data = await res.json();
			posts = data.slice(0, 3);
		}
	} catch {
		// fallback: posts stays empty
	}

	let subscriberCount = 0;
	try {
		const { getSubscriberCount } = await import('$lib/server/db');
		subscriberCount = await getSubscriberCount();
	} catch {
		// DB might not be set up yet
	}

	return { posts, subscriberCount };
};
