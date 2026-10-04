import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import { isAdmin } from '$lib/server/auth';

export const load: LayoutServerLoad = async ({ locals }) => {
	const userId = locals.userId;
	if (!isAdmin(userId)) {
		throw redirect(302, '/login/');
	}
	return { userId };
};
