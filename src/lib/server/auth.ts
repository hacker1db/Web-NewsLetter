import { env } from '$env/dynamic/private';
import { configureAuthKit, authKitHandle } from '@workos/authkit-sveltekit';
import type { Handle } from '@sveltejs/kit';

export function isAdmin(userId: string | undefined): boolean {
	return (
		!!userId &&
		(env.ADMIN_USER_IDS ?? '')
			.split(',')
			.map((id) => id.trim())
			.filter(Boolean)
			.includes(userId)
	);
}

export function authConfigured(): boolean {
	return !!(
		env.WORKOS_CLIENT_ID &&
		env.WORKOS_API_KEY &&
		env.WORKOS_REDIRECT_URI &&
		(env.WORKOS_COOKIE_PASSWORD?.length ?? 0) >= 32
	);
}

let handler: Handle | undefined;
export function getAuthHandler(): Handle {
	if (!handler) {
		configureAuthKit({
			clientId: env.WORKOS_CLIENT_ID!,
			apiKey: env.WORKOS_API_KEY!,
			redirectUri: env.WORKOS_REDIRECT_URI!,
			cookiePassword: env.WORKOS_COOKIE_PASSWORD!,
			cookieMaxAge: 8 * 60 * 60
		});
		handler = authKitHandle();
	}
	return handler;
}
