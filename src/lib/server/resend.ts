import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { env as publicEnv } from '$env/dynamic/public';
import { welcomeEmailHtml } from '$lib/emails/welcome';

let _resend: Resend | null = null;

function getResend(): Resend {
	if (!_resend) {
		const apiKey = env.RESEND_API_KEY;
		if (!apiKey) throw new Error('RESEND_API_KEY must be set');
		_resend = new Resend(apiKey);
	}
	return _resend;
}

function getSiteUrl(): string {
	return publicEnv.PUBLIC_SITE_URL || 'https://newsletter.hacker1db.dev';
}

export async function sendWelcomeEmail(email: string, token: string): Promise<void> {
	const siteUrl = getSiteUrl();
	const confirmUrl = `${siteUrl}/api/confirm/?token=${token}`;
	const unsubscribeUrl = `${siteUrl}/api/unsubscribe/?token=${token}`;

	await getResend().emails.send({
		from: 'hacker1db newsletter <newsletter@hacker1db.dev>',
		to: email,
		subject: 'Confirm your subscription to hacker1db',
		html: welcomeEmailHtml(confirmUrl, unsubscribeUrl)
	});
}

export async function sendNewsletterEmail(
	subscribers: { email: string; token: string }[],
	subject: string,
	html: string
): Promise<{ sent: number; failed: number }> {
	const { newsletterEmailHtml } = await import('$lib/emails/newsletter');
	const siteUrl = getSiteUrl();
	let sent = 0;
	let failed = 0;

	const chunkSize = 100;
	for (let i = 0; i < subscribers.length; i += chunkSize) {
		const chunk = subscribers.slice(i, i + chunkSize);

		for (const subscriber of chunk) {
			try {
				const unsubscribeUrl = `${siteUrl}/api/unsubscribe/?token=${subscriber.token}`;
				await getResend().emails.send({
					from: 'hacker1db newsletter <newsletter@hacker1db.dev>',
					to: subscriber.email,
					subject,
					html: newsletterEmailHtml(html, unsubscribeUrl)
				});
				sent++;
			} catch (err) {
				console.error(`Failed to send to ${subscriber.email}:`, err);
				failed++;
			}
		}
	}

	return { sent, failed };
}
