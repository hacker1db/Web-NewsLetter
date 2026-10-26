import { sendNewsletter } from '$lib/server/send-newsletter';
import { fail, redirect } from '@sveltejs/kit';
import { isAdmin } from '$lib/server/auth';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!isAdmin(locals.userId)) throw redirect(302, '/login/');
	let subscriberCount = 0;
	try {
		const { getSubscriberCount } = await import('$lib/server/db');
		subscriberCount = await getSubscriberCount();
	} catch {
		// DB not configured
	}
	return { subscriberCount };
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		if (!isAdmin(locals.userId)) return fail(401, { error: 'Unauthorized' });
		const form = await request.formData();
		const result = await sendNewsletter(locals.userId, form.get('subject'), form.get('htmlBody'));
		return result.status === 200 ? result.data : fail(result.status, result.data);
	}
};
