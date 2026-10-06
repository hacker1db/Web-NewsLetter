import type { PageServerLoad } from './$types';
import { getRecentPosts } from '$lib/server/blogPosts';

export const load: PageServerLoad = async () => {
	const posts = (await getRecentPosts(3)).map(({ title, url, date, tags }) => ({ title, url, date, tags }));

	let subscriberCount = 0;
	try {
		const { getSubscriberCount } = await import('$lib/server/db');
		subscriberCount = await getSubscriberCount();
	} catch {
		// DB might not be set up yet
	}

	return { posts, subscriberCount };
};
