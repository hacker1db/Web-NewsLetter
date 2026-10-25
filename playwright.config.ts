import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	outputDir: 'test-results/playwright',
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 1 : 0,
	workers: process.env.CI ? 2 : undefined,
	reporter: process.env.CI
		? [['github'], ['html', { open: 'never' }]]
		: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://127.0.0.1:4174',
		trace: 'retain-on-failure',
		screenshot: 'only-on-failure'
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		{ name: 'mobile-chrome', use: { ...devices['Pixel 7'] } }
	],
	webServer: {
		command: 'pnpm build && pnpm preview --host 127.0.0.1 --port 4174 --strictPort',
		url: 'http://127.0.0.1:4174',
		reuseExistingServer: false,
		timeout: 120000,
		env: {
			DATABASE_URL: '',
			RESEND_API_KEY: '',
			CLERK_SECRET_KEY: '',
			VITE_CLERK_PUBLISHABLE_KEY: ''
		}
	}
});
