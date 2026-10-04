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
		const formData = await request.formData();
		const subject = formData.get('subject') as string;
		const htmlBody = formData.get('htmlBody') as string;

		if (typeof subject !== 'string' || typeof htmlBody !== 'string' || !subject.trim() || !htmlBody.trim()) {
			return fail(400, { error: 'Subject and body are required.' });
		}

		try {
			const { getConfirmedSubscribers } = await import('$lib/server/db');
			const { sendNewsletterEmail } = await import('$lib/server/resend');
			const subscribers = await getConfirmedSubscribers();

			if (subscribers.length === 0) {
				return fail(400, { error: 'No confirmed subscribers.' });
			}

			const result = await sendNewsletterEmail(subscribers, subject, htmlBody);
			return { sent: result.sent, failed: result.failed };
		} catch (err) {
			console.error('Send newsletter error:', err);
			return fail(500, { error: 'Failed to send newsletter.' });
		}
	}
};
