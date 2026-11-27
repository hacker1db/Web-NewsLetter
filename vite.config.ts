import adapter from '@sveltejs/adapter-vercel';
import { sveltekit } from '@sveltejs/kit/vite';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig, loadEnv } from 'vite';
import { cspDirectives } from './src/lib/csp.js';

export default defineConfig(({ mode }) => {
	// The Clerk publishable key is a build-time value (see DEPLOYMENT.md); the CSP allows
	// exactly the Clerk Frontend API host encoded in it.
	const { VITE_CLERK_PUBLISHABLE_KEY } = loadEnv(mode, process.cwd(), 'VITE_');

	return {
		plugins: [
			tailwindcss(),
			sveltekit({
				preprocess: vitePreprocess(),
				adapter: adapter({ runtime: 'nodejs22.x' }),
				alias: {
					$lib: 'src/lib',
					$components: 'src/components'
				},
				csp: {
					mode: 'auto',
					// csp.js is untyped JavaScript; its string[] values are valid CSP sources.
					directives: cspDirectives(VITE_CLERK_PUBLISHABLE_KEY) as any
				}
			})
		],
		server: {
			port: 0
		}
	};
});
