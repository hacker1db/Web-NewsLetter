import adapter from '@sveltejs/adapter-vercel';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import { loadEnv } from 'vite';
import { cspDirectives } from './src/lib/csp.js';

// The Clerk publishable key is a build-time value (see DEPLOYMENT.md); the CSP allows
// exactly the Clerk Frontend API host encoded in it.
const { VITE_CLERK_PUBLISHABLE_KEY } = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), 'VITE_');

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ runtime: 'nodejs22.x' }),
		alias: {
			$lib: 'src/lib',
			$components: 'src/components'
		},
		csp: {
			mode: 'auto',
			directives: /** @type {any} */ (cspDirectives(VITE_CLERK_PUBLISHABLE_KEY))
		},
		paths: {}
	}
};

export default config;
