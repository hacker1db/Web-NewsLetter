import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { revokeAdminSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ cookies }) => {
	// Revoke the Clerk session too; the cookie is cleared even if Clerk is unreachable.
	await revokeAdminSession(cookies.get('admin_session'));
	cookies.delete('admin_session', { path: '/' });
	throw redirect(302, '/login/');
};
