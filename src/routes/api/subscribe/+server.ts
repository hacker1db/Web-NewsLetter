import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const INVALID = { error: 'Please enter a valid email address.' };

async function readEmail(request: Request): Promise<unknown> {
	const contentType = request.headers.get('content-type') ?? '';
	try {
		if (contentType.includes('application/json')) {
			const body: unknown = await request.json();
			return body && typeof body === 'object' ? (body as Record<string, unknown>).email : undefined;
		}
		return (await request.formData()).get('email');
	} catch {
		return undefined;
	}
}

// Every accepted address gets the same response, whether it is new, pending, already
// active, or inside the resend cooldown, so the endpoint does not reveal who subscribed.
export const POST: RequestHandler = async ({ request }) => {
	const raw = await readEmail(request);
	if (typeof raw !== 'string') return json(INVALID, { status: 400 });
	const email = raw.trim().toLowerCase();
	if (email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) return json(INVALID, { status: 400 });

	try {
		const { addSubscriber, finalizeSubscription, releaseSendReservation } = await import('$lib/server/db');
		const { sendWelcomeEmail } = await import('$lib/server/resend');

		const tokens = await addSubscriber(email);
		if (tokens) {
			try {
				await sendWelcomeEmail(email, tokens.confirmationToken, tokens.unsubscribeToken);
			} catch (err) {
				await releaseSendReservation(tokens).catch(() => {});
				throw err;
			}
			// False only when the address was confirmed meanwhile; the response stays uniform.
			await finalizeSubscription(tokens);
		}

		return json({ success: true });
	} catch (err) {
		console.error('Subscribe error:', err);
		return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
	}
};
