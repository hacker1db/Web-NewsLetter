import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) {
		throw redirect(302, '/?error=invalid');
	}

	try {
		const { confirmSubscriber } = await import('$lib/server/db');
		const confirmed = await confirmSubscriber(token);
		if (confirmed) {
			throw redirect(302, '/?confirmed=true');
		}
	} catch (err) {
		// Re-throw redirects
		if (err && typeof err === 'object' && 'status' in err) throw err;
	}

	throw redirect(302, '/?error=invalid');
};
