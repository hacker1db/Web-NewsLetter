import { redirect } from '@sveltejs/kit';
import { authKit } from '@workos/authkit-sveltekit';
import { authConfigured, isAdmin } from '$lib/server/auth';
import type { PageServerLoad, Actions } from './$types';
export const load: PageServerLoad = ({ locals }) => {
	if (isAdmin(locals.userId)) redirect(302, '/admin/');
	return { configured: authConfigured(), denied: !!locals.auth?.user };
};
export const actions: Actions = {
	default: async () => {
		if (!authConfigured()) return { unavailable: true };
		redirect(303, await authKit.getSignInUrl({ returnTo: '/admin/' }));
	}
};
