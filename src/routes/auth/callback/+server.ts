import { authKit } from '@workos/authkit-sveltekit';
import { error } from '@sveltejs/kit';
import { authConfigured } from '$lib/server/auth';
import type { RequestHandler } from './$types';
export const GET: RequestHandler = (event) => {
	if (!authConfigured()) error(503, 'Admin sign-in is temporarily unavailable.');
	return authKit.handleCallback()(event);
};
