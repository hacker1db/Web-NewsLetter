import { test, expect } from '@playwright/test';

// Browser-contract coverage: /api/subscribe is intercepted; no email or DB delivery is claimed.
test('home is usable without horizontal overflow and captures evidence', async ({
	page
}, testInfo) => {
	await page.goto('/');
	await expect(page.getByRole('button', { name: 'Subscribe', exact: true })).toBeVisible();
	await expect(page.getByRole('textbox', { name: 'Email address' })).toBeVisible();
	expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
		true
	);
	await testInfo.attach('home', {
		body: await page.screenshot({ fullPage: true }),
		contentType: 'image/png'
	});
});

test('native validation blocks empty and malformed submissions', async ({ page }) => {
	let requests = 0;
	await page.route('**/api/subscribe', (route) => {
		requests++;
		return route.fulfill({ json: {} });
	});
	await page.goto('/');
	const input = page.getByRole('textbox', { name: 'Email address' });
	await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
	expect(await input.evaluate((element: HTMLInputElement) => element.validity.valueMissing)).toBe(
		true
	);
	await input.fill('invalid');
	await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
	expect(await input.evaluate((element: HTMLInputElement) => element.validity.typeMismatch)).toBe(
		true
	);
	expect(requests).toBe(0);
});

test('successful signup renders pending screen', async ({ page }, testInfo) => {
	await page.route('**/api/subscribe', (route) => route.fulfill({ json: { success: true } }));
	await page.goto('/');
	await page.getByRole('textbox', { name: 'Email address' }).fill('reader@example.com');
	await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
	await expect(page).toHaveURL(/\/success\/$/);
	await expect(page.getByText('Check your inbox and click the confirmation link.')).toBeVisible();
	await testInfo.attach('pending', {
		body: await page.screenshot({ fullPage: true }),
		contentType: 'image/png'
	});
});

for (const status of [400, 409, 500]) {
	test(`signup ${status} displays error and permits retry`, async ({ page }) => {
		await page.route('**/api/subscribe', (route) =>
			route.fulfill({ status, json: { error: `Test failure ${status}` } })
		);
		await page.goto('/');
		await page.getByRole('textbox', { name: 'Email address' }).fill('reader@example.com');
		await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
		await expect(page.getByRole('alert')).toHaveText(`Test failure ${status}`);
		await expect(page.getByRole('button', { name: 'Subscribe', exact: true })).toBeEnabled();
		await expect(page).toHaveURL(/\/$/);
	});
}

test('network failure recovers the form', async ({ page }) => {
	await page.route('**/api/subscribe', (route) => route.abort());
	await page.goto('/');
	await page.getByRole('textbox', { name: 'Email address' }).fill('reader@example.com');
	await page.getByRole('button', { name: 'Subscribe', exact: true }).click();
	await expect(page.getByRole('alert')).toContainText('Something went wrong');
	await expect(page.getByRole('button', { name: 'Subscribe', exact: true })).toBeEnabled();
});

test('actual routes reject missing confirmation and anonymous admin access', async ({
	request
}) => {
	const confirmation = await request.get('/api/confirm', { maxRedirects: 0 });
	expect(confirmation.status()).toBe(302);
	expect(confirmation.headers().location).toBe('/?error=invalid');
	const admin = await request.get('/admin/', { maxRedirects: 0 });
	expect(admin.status()).toBe(302);
	expect(admin.headers().location).toBe('/login/');
});

test('confirmed display is distinct from pending', async ({ page }) => {
	await page.goto('/success/?confirmed=true');
	await expect(
		page.getByText("You're confirmed and will receive future hacker1db newsletter posts.")
	).toBeVisible();
});

test('admin login starts hosted WorkOS auth without client-side credentials', async ({ page }) => {
	await page.goto('/login/');
	await expect(page.getByRole('heading', { name: 'Newsletter admin' })).toBeVisible();
	await expect(page.getByRole('button', { name: 'Continue to sign in' })).toBeVisible();
	// Inspect the real form response without following it to the external provider.
	const response = await page.request.post('/login/', {
		form: {},
		headers: { origin: 'http://127.0.0.1:4174', accept: 'text/html' },
		maxRedirects: 0
	});
	expect(response.status()).toBe(303);
	const url = new URL(response.headers().location);
	expect(url.origin).toBe('https://api.workos.com');
	expect(url.pathname).toBe('/user_management/authorize');
	expect(url.searchParams.get('code_challenge_method')).toBe('S256');
	expect(url.searchParams.get('redirect_uri')).toBe('http://127.0.0.1:4174/auth/callback/');
});

test('invalid callback gives a recoverable sign-in error', async ({ page }) => {
	await page.goto('/auth/callback/');
	await expect(page.getByRole('heading', { name: 'Sign-in could not be completed' })).toBeVisible();
	await expect(page.getByRole('link', { name: 'Return to login' })).toBeVisible();
});
