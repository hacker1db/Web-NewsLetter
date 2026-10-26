import { authKit } from '@workos/authkit-sveltekit';
import { error, redirect } from '@sveltejs/kit';
import { authConfigured } from '$lib/server/auth';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = async () => {
	if (!authConfigured()) error(503, 'Admin sign-in is temporarily unavailable.');
	redirect(302, await authKit.getSignInUrl({ returnTo: '/admin/' }));
};
