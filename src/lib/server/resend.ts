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

export async function sendWelcomeEmail(
	email: string,
	confirmationToken: string,
	unsubscribeToken: string
): Promise<void> {
	const siteUrl = getSiteUrl();
	const confirmUrl = `${siteUrl}/api/confirm/?token=${encodeURIComponent(confirmationToken)}`;
	const unsubscribeUrl = `${siteUrl}/api/unsubscribe/?token=${encodeURIComponent(unsubscribeToken)}`;

	const { data, error } = await getResend().emails.send({
		from: 'hacker1db newsletter <newsletter@hacker1db.dev>',
		to: email,
		subject: 'Confirm your subscription to hacker1db',
		html: welcomeEmailHtml(confirmUrl, unsubscribeUrl)
	});
	if (error) {
		console.error('Resend rejected the welcome email:', error);
		throw new Error('Welcome email was not accepted by Resend');
	}
	if (!data?.id) throw new Error('Welcome email was not accepted by Resend');
}

export async function sendNewsletterEmail(
	subscribers: { email: string; unsubscribeToken: string }[],
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
				const unsubscribeUrl = `${siteUrl}/api/unsubscribe/?token=${encodeURIComponent(subscriber.unsubscribeToken)}`;
				const { data, error } = await getResend().emails.send({
					from: 'hacker1db newsletter <newsletter@hacker1db.dev>',
					to: subscriber.email,
					subject,
					html: newsletterEmailHtml(html, unsubscribeUrl),
					headers: {
						'List-Unsubscribe': `<${unsubscribeUrl}>`,
						'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
					}
				});
				if (error || !data?.id) throw new Error('Newsletter email was not accepted by Resend');
				sent++;
			} catch {
				console.error('Newsletter email was not accepted by Resend');
				failed++;
			}
		}
	}

	return { sent, failed };
}
