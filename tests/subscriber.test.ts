import { beforeEach, expect, it, vi } from 'vitest';
import { env } from './env';

type Subscriber = { id: string; email: string; status: 'pending' | 'active' | 'unsubscribed'; confirmHash: string; unsubscribeHash: string };
const subscribers = new Map<string, Subscriber>();
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => sql) }));
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send }; } }));

import { addSubscriber, confirmSubscriber, finalizeSubscription, getConfirmedSubscribers, unsubscribeSubscriber } from '../src/lib/server/db';
import { POST as subscribe } from '../src/routes/api/subscribe/+server';

beforeEach(() => {
	subscribers.clear();
	env.DATABASE_URL = 'postgresql://test';
	env.SUBSCRIBER_TOKEN_SECRET = 'test-only-long-signing-secret';
	env.RESEND_API_KEY = 'test-only';
	send.mockReset();
	vi.spyOn(console, 'error').mockImplementation(() => {});
	sql.mockImplementation(async (strings: TemplateStringsArray, ...values: string[]) => {
		const query = strings.join('?');
		if (query.includes('INSERT INTO subscribers')) {
			const [id, email, confirmHash, unsubscribeHash] = values;
			const existing = subscribers.get(email);
			if (existing?.status === 'active') return [];
			const conflict = query.split('ON CONFLICT')[1].split('RETURNING')[0];
			expect(conflict).not.toMatch(/confirm_token_hash\s*=|unsubscribe_token_hash\s*=|id\s*=/);
			if (existing) return [{ id: existing.id, confirm_token_hash: existing.confirmHash }];
			subscribers.set(email, { id, email, status: 'pending', confirmHash, unsubscribeHash });
			return [{ id, confirm_token_hash: confirmHash }];
		}
		if (query.includes("SET status = 'pending'")) {
			expect(query).toContain('AND confirm_token_hash =');
			expect(query).toContain("AND status IN ('pending', 'unsubscribed')");
			const [confirmHash, unsubscribeHash, id, previousHash] = values;
			const record = [...subscribers.values()].find((item) => item.id === id && item.confirmHash === previousHash && item.status !== 'active');
			if (!record) return [];
			Object.assign(record, { status: 'pending', confirmHash, unsubscribeHash });
			return [{ id }];
		}
		if (query.includes("SET status = 'active'")) {
			const record = [...subscribers.values()].find((item) => item.status === 'pending' && item.confirmHash === values[0]);
			if (!record) return [];
			record.status = 'active';
			return [{ id: record.id }];
		}
		if (query.includes("SET status = 'unsubscribed'")) {
			const record = [...subscribers.values()].find((item) => item.unsubscribeHash === values[0]);
			if (!record) return [];
			record.status = 'unsubscribed';
			return [{ id: record.id }];
		}
		if (query.includes('SELECT id, email')) {
			return [...subscribers.values()].filter((item) => item.status === 'active').map(({ id, email }) => ({ id, email }));
		}
		return [{ count: String([...subscribers.values()].filter((item) => item.status === 'active').length) }];
	});
});

it('requires confirmation, suppresses unsubscribed records, and permits a fresh re-subscription', async () => {
	const first = await addSubscriber('test@example.com');
	expect(first).not.toBeNull();
	expect(await confirmSubscriber(first!.confirmationToken)).toBe(true);
	expect(await getConfirmedSubscribers()).toEqual([{ email: 'test@example.com', unsubscribeToken: first!.unsubscribeToken }]);
	expect(await unsubscribeSubscriber(first!.unsubscribeToken)).toBe(true);
	expect(await unsubscribeSubscriber(first!.unsubscribeToken)).toBe(true);
	expect(await getConfirmedSubscribers()).toEqual([]);
	const resubscription = await addSubscriber('test@example.com');
	expect(resubscription!.confirmationToken).not.toBe(first!.confirmationToken);
	expect(await getConfirmedSubscribers()).toEqual([]);
	expect(await finalizeSubscription(resubscription!)).toBe(true);
	expect(await confirmSubscriber(resubscription!.confirmationToken)).toBe(true);
	expect(await getConfirmedSubscribers()).toHaveLength(1);
});

it('permits a new pending confirmation attempt after provider rejection', async () => {
	function event() {
		return { request: new Request('https://newsletter.hacker1db.dev/api/subscribe/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com' }) }) };
	}
	send.mockResolvedValueOnce({ data: null, error: { message: 'Rejected' } }).mockResolvedValueOnce({ data: { id: 'email_test' }, error: null });
	const original = await addSubscriber('test@example.com');
	const originalRecord = { ...subscribers.get('test@example.com')! };
	expect((await subscribe(event() as never)).status).toBe(500);
	expect(subscribers.get('test@example.com')).toEqual(originalRecord);
	expect((await subscribe(event() as never)).status).toBe(200);
	expect(send.mock.calls[0][0].html).not.toBe(send.mock.calls[1][0].html);
	expect(subscribers.get('test@example.com')!.id).toBe(original!.subscriberId);
});

it('allows an old pending link to confirm after replacement email fails', async () => {
	const original = await addSubscriber('test@example.com');
	send.mockResolvedValue({ data: null, error: { message: 'Rejected' } });
	const request = new Request('https://newsletter.hacker1db.dev/api/subscribe/', {
		method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'test@example.com' })
	});
	expect((await subscribe({ request } as never)).status).toBe(500);
	expect(await confirmSubscriber(original!.confirmationToken)).toBe(true);
});

it('does not overwrite a subscription confirmed while replacement mail was sending', async () => {
	const original = await addSubscriber('test@example.com');
	const replacement = await addSubscriber('test@example.com');
	expect(await confirmSubscriber(original!.confirmationToken)).toBe(true);
	expect(await finalizeSubscription(replacement!)).toBe(false);
	expect(await getConfirmedSubscribers()).toHaveLength(1);
});
