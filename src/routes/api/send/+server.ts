import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
	const userId = (locals as Record<string, unknown>).userId as string | null ?? null;
	if (!userId) {
		return new Response('Unauthorized', { status: 401 });
	}

	const { subject, htmlBody } = await request.json();

	if (!subject || !htmlBody) {
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
