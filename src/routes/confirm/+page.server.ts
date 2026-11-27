import { redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

// Opening the link only shows a confirm button. Mail scanners and link previews fetch
// URLs with GET, so the subscription changes only on the POST that the button sends.
export const load: PageServerLoad = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) throw redirect(303, '/?error=invalid');
	return { token };
};

export const actions: Actions = {
	default: async ({ request }) => {
		const token = (await request.formData()).get('token');
		if (typeof token !== 'string' || !token) throw redirect(303, '/?error=invalid');

		let confirmed = false;
		try {
			const { confirmSubscriber } = await import('$lib/server/db');
			confirmed = await confirmSubscriber(token);
		} catch {
			confirmed = false;
		}
		throw redirect(303, confirmed ? '/success/?confirmed=true' : '/?error=invalid');
	}
};
