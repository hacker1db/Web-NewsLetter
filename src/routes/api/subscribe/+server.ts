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
		const { addSubscriber } = await import('$lib/server/db');
		const { sendWelcomeEmail } = await import('$lib/server/resend');

		const token = crypto.randomUUID();
		await addSubscriber(email, token);
		await sendWelcomeEmail(email, token);

		return json({ success: true });
	} catch (err) {
		// Check for UNIQUE constraint violation
		if (err instanceof Error && err.message.includes('UNIQUE')) {
			return json({ error: 'This email is already subscribed.' }, { status: 409 });
		}
		console.error('Subscribe error:', err);
		return json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
	}
};
