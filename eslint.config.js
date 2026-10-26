import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import globals from 'globals';
import ts from 'typescript-eslint';
import svelte from 'eslint-plugin-svelte';
import svelteConfig from './svelte.config.js';

export default defineConfig(
	{
		ignores: [
			'.svelte-kit/**',
			'.vercel/**',
			'build/**',
			'coverage/**',
			'playwright-report/**',
			'test-results/**',
			'node_modules/**'
		]
	},
	js.configs.recommended,
	ts.configs.recommended,
	svelte.configs.recommended,
	svelte.configs.prettier,
	{ languageOptions: { globals: { ...globals.browser, ...globals.node } } },
	{
		files: ['**/*.svelte', '**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: { parserOptions: { parser: ts.parser, svelteConfig } }
	}
);
