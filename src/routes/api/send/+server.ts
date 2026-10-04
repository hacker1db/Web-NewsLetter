import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!isAdmin(locals.userId)) {
		return new Response('Unauthorized', { status: 401 });
	}

	if (request.headers.has('origin') && request.headers.get('origin') !== url.origin) {
		return json({ error: 'Forbidden' }, { status: 403 });
	}
	let subject: unknown;
	let htmlBody: unknown;
	try {
		({ subject, htmlBody } = await request.json());
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
	if (typeof subject !== 'string' || typeof htmlBody !== 'string' || !subject.trim() || !htmlBody.trim()) {
		return json({ error: 'Subject and body are required.' }, { status: 400 });
	}

	try {
		const { getConfirmedSubscribers } = await import('$lib/server/db');
		const { sendNewsletterEmail } = await import('$lib/server/resend');
		const subscribers = await getConfirmedSubscribers();

		if (subscribers.length === 0) {
			return json({ error: 'No confirmed subscribers.' }, { status: 400 });
		}

		const result = await sendNewsletterEmail(subscribers, subject, htmlBody);
		return json({ sent: result.sent, failed: result.failed });
	} catch (err) {
		console.error('Send API error:', err);
		return json({ error: 'Failed to send newsletter.' }, { status: 500 });
	}
};
