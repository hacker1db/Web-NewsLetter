import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { isAdmin } from '$lib/server/auth';
import { sendNewsletter } from '$lib/server/send-newsletter';
export const POST: RequestHandler = async ({ request, locals, url }) => {
	if (!isAdmin(locals.userId)) return new Response('Unauthorized', { status: 401 });
	if (request.headers.get('origin') !== url.origin)
		return json({ error: 'Forbidden' }, { status: 403 });
	let body;
	try {
		body = await request.json();
	} catch {
		return json({ error: 'Invalid request body' }, { status: 400 });
	}
	const result = await sendNewsletter(locals.userId, body?.subject, body?.htmlBody);
	return json(result.data, { status: result.status });
};
