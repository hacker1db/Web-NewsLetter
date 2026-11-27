import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Older confirmation emails link here. Forward to the confirmation page without
// changing any state; the page confirms only on POST.
export const GET: RequestHandler = async ({ url }) => {
	const token = url.searchParams.get('token');
	if (!token) throw redirect(303, '/?error=invalid');
	throw redirect(303, `/confirm/?token=${encodeURIComponent(token)}`);
};
