import { spawn } from 'node:child_process';
import { chromium } from '@playwright/test';

// Reuse the lockfile-matched Chromium installed by `playwright install chromium`.
const server = spawn(
	'pnpm',
	[
		'exec',
		'playwright-mcp',
		'--headless',
		'--isolated',
		'--browser',
		'chrome',
		'--executable-path',
		chromium.executablePath(),
		'--output-dir',
		'test-results/mcp'
	],
	{ stdio: 'inherit' }
);
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => server.kill(signal));
server.on('exit', (code) => process.exit(code ?? 1));
server.on('error', (error) => {
	console.error(error);
	process.exit(1);
});
