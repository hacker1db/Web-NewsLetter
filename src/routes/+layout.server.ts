import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
	const userId = (locals as Record<string, unknown>).userId as string | null ?? null;
	return { userId };
};
