import type { RequestHandler } from './$types';

async function unsubscribe(token: string | null): Promise<boolean> {
	if (!token) return false;

	try {
		const { unsubscribeSubscriber } = await import('$lib/server/db');
		return await unsubscribeSubscriber(token);
	} catch {
		return false;
	}
}

export const GET: RequestHandler = async ({ url }) => {
	const unsubscribed = await unsubscribe(url.searchParams.get('token'));

	const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unsubscribed - hacker1db newsletter</title>
</head>
<body style="margin: 0; padding: 0; background-color: #1a1d21; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; justify-content: center; align-items: center; min-height: 100vh;">
<div style="text-align: center; padding: 2rem;">
<p style="font-family: Monaco, Menlo, 'Courier New', monospace; font-size: 1.25rem; color: #6FC1FF; margin-bottom: 1rem;">
${unsubscribed ? '&#10003; You\'ve been unsubscribed.' : 'Invalid or expired link.'}
</p>
<p style="color: #9ca3af; font-size: 0.875rem; margin-bottom: 2rem;">
${unsubscribed ? 'Sorry to see you go. You can always resubscribe.' : 'This unsubscribe link is invalid or expired.'}
</p>
<a href="https://newsletter.hacker1db.dev" style="color: #6FC1FF; text-decoration: none; font-weight: 500;">&larr; Back to newsletter</a>
</div>
</body>
</html>`;

	return new Response(html, {
		headers: { 'Content-Type': 'text/html; charset=utf-8' }
	});
};

// RFC 8058 one-click unsubscribe requests are POSTs to the URL advertised in
// List-Unsubscribe. Keep it distinct from the browser-friendly GET response.
export const POST: RequestHandler = async ({ url }) => {
	const unsubscribed = await unsubscribe(url.searchParams.get('token'));
	return new Response(unsubscribed ? 'Unsubscribed' : 'Invalid unsubscribe link', {
		status: unsubscribed ? 200 : 400,
		headers: { 'Content-Type': 'text/plain; charset=utf-8' }
	});
};
