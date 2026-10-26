declare global {
	namespace App {
		interface Locals {
			userId?: string;
			auth: import('@workos/authkit-sveltekit').AuthKitAuth;
		}
	}
}
export {};
