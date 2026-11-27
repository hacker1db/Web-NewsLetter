import { beforeEach, expect, it, vi } from 'vitest';

const { confirmSubscriber } = vi.hoisted(() => ({ confirmSubscriber: vi.fn() }));
vi.mock('$lib/server/db', () => ({ confirmSubscriber }));

import { GET as legacyConfirm } from '../src/routes/api/confirm/+server';
import { actions, load } from '../src/routes/confirm/+page.server';

const origin = 'https://newsletter.hacker1db.dev';

async function redirectOf(promise: Promise<unknown>): Promise<{ status: number; location: string }> {
	try {
		await promise;
	} catch (err) {
		return err as { status: number; location: string };
	}
	throw new Error('expected a redirect');
}

function post(token?: string) {
	const form = new FormData();
	if (token !== undefined) form.set('token', token);
	return { request: new Request(`${origin}/confirm/`, { method: 'POST', body: form }) };
}

beforeEach(() => {
	confirmSubscriber.mockReset();
});

it('GET on the confirmation link changes nothing', async () => {
	expect(await load({ url: new URL(`${origin}/confirm/?token=abc`) } as never)).toEqual({ token: 'abc' });
	expect(await redirectOf(legacyConfirm({ url: new URL(`${origin}/api/confirm/?token=a%2Bb`) } as never)))
		.toMatchObject({ status: 303, location: '/confirm/?token=a%2Bb' });
	expect(confirmSubscriber).not.toHaveBeenCalled();
});

it('GET without a token redirects to the error page', async () => {
	expect(await redirectOf(Promise.resolve().then(() => load({ url: new URL(`${origin}/confirm/`) } as never))))
		.toMatchObject({ status: 303, location: '/?error=invalid' });
	expect(await redirectOf(legacyConfirm({ url: new URL(`${origin}/api/confirm/`) } as never)))
		.toMatchObject({ location: '/?error=invalid' });
});

it('POST confirms the subscription', async () => {
	confirmSubscriber.mockResolvedValue(true);
	expect(await redirectOf(actions.default(post('abc') as never))).toMatchObject({ status: 303, location: '/success/?confirmed=true' });
	expect(confirmSubscriber).toHaveBeenCalledWith('abc');
});

it('POST with an invalid, expired, or missing token fails closed', async () => {
	confirmSubscriber.mockResolvedValue(false);
	expect(await redirectOf(actions.default(post('expired') as never))).toMatchObject({ location: '/?error=invalid' });
	expect(await redirectOf(actions.default(post() as never))).toMatchObject({ location: '/?error=invalid' });
});

it('POST fails closed when the database is unavailable', async () => {
	confirmSubscriber.mockImplementation(async () => { throw new Error('db down'); });
	const result = await redirectOf(actions.default(post('abc') as never));
	expect(result).toMatchObject({ status: 303, location: '/?error=invalid' });
});
