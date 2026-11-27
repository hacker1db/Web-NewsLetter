// Content-Security-Policy for every page. Kept in plain JavaScript so svelte.config.js
// can import it and tests can check it.

/** Exact @clerk/ui release paired with the installed @clerk/clerk-js (6.37.0). */
export const CLERK_UI_VERSION = '1.38.1';

/**
 * Returns the Clerk Frontend API host encoded in a publishable key
 * (pk_<env>_<base64 of "host$">), or null when the key is missing or malformed.
 * @param {string | undefined} publishableKey
 * @returns {string | null}
 */
export function clerkFrontendApiHost(publishableKey) {
	const encoded = publishableKey?.split('_')[2];
	if (!encoded) return null;
	let decoded;
	try {
		decoded = atob(encoded);
	} catch {
		return null;
	}
	const host = decoded.endsWith('$') ? decoded.slice(0, -1) : '';
	return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(host) ? host : null;
}

/**
 * CSP directives for SvelteKit's kit.csp. Clerk needs its Frontend API for the UI
 * bundle and API calls, img.clerk.com for avatars, Cloudflare Turnstile for bot
 * checks, and blob: workers (https://clerk.com/docs/security/clerk-csp).
 * @param {string | undefined} publishableKey
 */
export function cspDirectives(publishableKey) {
	const host = clerkFrontendApiHost(publishableKey);
	const clerk = host ? [`https://${host}`] : [];
	const turnstile = 'https://challenges.cloudflare.com';
	return {
		'default-src': ['self'],
		'base-uri': ['self'],
		'object-src': ['none'],
		'frame-ancestors': ['none'],
		'form-action': ['self'],
		'script-src': ['self', ...clerk, turnstile],
		'connect-src': ['self', ...clerk],
		'img-src': ['self', 'data:', 'https://img.clerk.com'],
		// Components use inline style attributes, and Clerk injects its own styles.
		'style-src': ['self', 'unsafe-inline'],
		'font-src': ['self'],
		'frame-src': [turnstile],
		'worker-src': ['self', 'blob:']
	};
}
