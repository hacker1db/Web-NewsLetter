import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn, execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('test-results/mcp');
await mkdir(output, { recursive: true });
const url = 'http://127.0.0.1:4175';
// A fresh preview with no provider credentials; never connects to a user's browser profile.
const preview = spawn(
	'pnpm',
	['preview', '--host', '127.0.0.1', '--port', '4175', '--strictPort'],
	{
		stdio: 'ignore',
		env: {
			...process.env,
			DATABASE_URL: '',
			RESEND_API_KEY: '',
			WORKOS_API_KEY: 'sk_test_browser_fixture',
			WORKOS_CLIENT_ID: 'client_browser_fixture',
			WORKOS_COOKIE_PASSWORD: 'test-only-browser-cookie-password-32-characters',
			WORKOS_REDIRECT_URI: 'http://127.0.0.1:4175/auth/callback/'
		}
	}
);
const client = new Client({ name: 'newsletter-mcp-verification', version: '1.0.0' });
const transport = new StdioClientTransport({
	command: process.execPath,
	args: ['scripts/playwright-mcp.mjs'],
	stderr: 'inherit'
});
const evidence = [];
async function call(name, args) {
	const result = await client.callTool({ name, arguments: args });
	if (result.isError) throw new Error(JSON.stringify(result.content));
	return result;
}
try {
	let ready = false;
	for (let attempt = 0; attempt < 60; attempt++) {
		if (preview.exitCode !== null) throw new Error('Preview exited before readiness');
		try {
			if ((await fetch(url)).ok) {
				ready = true;
				break;
			}
		} catch {
			/* Wait for startup. */
		}
		await new Promise((resolve) => setTimeout(resolve, 500));
	}
	if (!ready) throw new Error('Preview did not become ready');
	await client.connect(transport);
	const { tools } = await client.listTools();
	await writeFile(resolve(output, 'tools.json'), JSON.stringify(tools, null, 2));
	for (const name of [
		'browser_navigate',
		'browser_snapshot',
		'browser_resize',
		'browser_take_screenshot'
	]) {
		if (!tools.some((tool) => tool.name === name)) throw new Error(`Missing MCP tool ${name}`);
	}
	for (const [scenario, width, height] of [
		['desktop-home', 1280, 900],
		['mobile-home', 390, 844],
		['desktop-login', 1280, 900],
		['mobile-login', 390, 844],
		['desktop-auth-error', 1280, 900],
		['mobile-auth-error', 390, 844]
	]) {
		await call('browser_resize', { width, height });
		const scenarioUrl =
			url +
			(scenario.includes('login')
				? '/login/'
				: scenario.includes('auth-error')
					? '/auth/callback/'
					: '/');
		await call('browser_navigate', { url: scenarioUrl });
		const snapshot = await call('browser_snapshot', {});
		const text = snapshot.content
			.filter((item) => item.type === 'text')
			.map((item) => item.text)
			.join('\n');
		if (
			scenario.includes('home') &&
			(!text.includes('Email address') || !text.includes('Subscribe'))
		)
			throw new Error('Signup controls missing from MCP snapshot');
		if (scenario.includes('login') && !text.includes('Continue to sign in'))
			throw new Error('Hosted login control missing');
		if (scenario.includes('auth-error') && !text.includes('Sign-in could not be completed'))
			throw new Error('Auth error recovery missing');
		await writeFile(resolve(output, `${scenario}.txt`), text);
		const result = await call('browser_take_screenshot', {
			type: 'png',
			filename: `test-results/mcp/${scenario}.png`,
			fullPage: true
		});
		// Preserve the protocol response metadata without embedding image data in logs.
		evidence.push({
			scenario,
			url: scenarioUrl,
			viewport: { width, height },
			timestamp: new Date().toISOString(),
			screenshot: `${scenario}.png`,
			mode: 'local preview, fake WorkOS configuration, no live provider calls',
			tool: 'browser_take_screenshot',
			response: result.content.filter((item) => item.type === 'text')
		});
	}
	await writeFile(
		resolve(output, 'manifest.json'),
		JSON.stringify(
			{
				sha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(),
				dirty: !!execFileSync('git', ['status', '--porcelain'], { encoding: 'utf8' }).trim(),
				evidence
			},
			null,
			2
		)
	);
	console.log(
		'MCP verified: tool discovery, navigation, snapshots and desktop/mobile screenshots.'
	);
} finally {
	await client.close();
	await transport.close();
	preview.kill('SIGTERM');
}
