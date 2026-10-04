import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const POST: RequestHandler = async ({ request }) => {
	let email: string | null = null;

	const contentType = request.headers.get('content-type') ?? '';
	if (contentType.includes('application/json')) {
		const body = await request.json();
		email = body.email;
	} else {
		const formData = await request.formData();
		email = formData.get('email') as string;
	}

	if (!email || !EMAIL_REGEX.test(email)) {
		return json({ error: 'Please enter a valid email address.' }, { status: 400 });
	}

	email = email.toLowerCase().trim();

	try {
		const { addSubscriber, finalizeSubscription } = await import('$lib/server/db');
		const { sendWelcomeEmail } = await import('$lib/server/resend');

		const tokens = await addSubscriber(email);
		if (!tokens) return json({ error: 'This email is already subscribed.' }, { status: 409 });
		await sendWelcomeEmail(email, tokens.confirmationToken, tokens.unsubscribeToken);
		if (!await finalizeSubscription(tokens)) {
			return json({ error: 'Subscription changed. Please try again.' }, { status: 409 });
		}

		return json({ success: true });
	} catch (err) {
		console.error('Subscribe error:', err);
		return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
	}
};
