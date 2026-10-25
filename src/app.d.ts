// See https://svelte.dev/docs/kit/types#app.d.ts

declare global {
	interface Window {
		/** Undocumented Clerk UI constructor, checked by Clerk at runtime. */
		__internal_ClerkUICtor?: unknown;
	}
	namespace App {
		interface Locals {
			userId?: string;
		}
	}
}

export {};
