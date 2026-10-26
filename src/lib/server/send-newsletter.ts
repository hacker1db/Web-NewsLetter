import { isAdmin } from './auth';
export async function sendNewsletter(
	userId: string | undefined,
	subject: unknown,
	htmlBody: unknown
) {
	if (!isAdmin(userId)) return { status: 401, data: { error: 'Unauthorized' } } as const;
	if (
		typeof subject !== 'string' ||
		typeof htmlBody !== 'string' ||
		!subject.trim() ||
		!htmlBody.trim()
	)
		return { status: 400, data: { error: 'Subject and body are required.' } } as const;
	try {
		const { getConfirmedSubscribers } = await import('./db');
		const { sendNewsletterEmail } = await import('./resend');
		const subscribers = await getConfirmedSubscribers();
		if (!subscribers.length)
			return { status: 400, data: { error: 'No confirmed subscribers.' } } as const;
		const { sent, failed } = await sendNewsletterEmail(subscribers, subject, htmlBody);
		return { status: 200, data: { sent, failed } } as const;
	} catch {
		return { status: 500, data: { error: 'Failed to send newsletter.' } } as const;
	}
}
