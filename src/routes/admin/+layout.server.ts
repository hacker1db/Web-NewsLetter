import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const userId = (locals as Record<string, unknown>).userId as string | null ?? null;
	if (!userId) {
		throw redirect(302, '/login/');
	}
	return { userId };
};
