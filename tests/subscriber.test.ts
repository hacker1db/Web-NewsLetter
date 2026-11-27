import { beforeEach, expect, it, vi } from 'vitest';
import { env } from './env';

type Subscriber = {
	id: string; email: string; status: 'pending' | 'active' | 'unsubscribed'; confirmHash: string; unsubscribeHash: string;
	lastSentAt: number | null; confirmExpiresAt: number;
};
const subscribers = new Map<string, Subscriber>();
const { sql } = vi.hoisted(() => ({ sql: vi.fn() }));
vi.mock('@neondatabase/serverless', () => ({ neon: vi.fn(() => sql) }));
const { send } = vi.hoisted(() => ({ send: vi.fn() }));
vi.mock('resend', () => ({ Resend: class { emails = { send }; } }));

import {
	CONFIRMATION_RESEND_COOLDOWN_SECONDS, CONFIRMATION_TOKEN_TTL_SECONDS, addSubscriber, confirmSubscriber,
	finalizeSubscription, getConfirmedSubscribers, unsubscribeSubscriber
} from '../src/lib/server/db';
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
		const now = Date.now();
		if (query.includes('INSERT INTO subscribers')) {
			const [id, email, confirmHash, unsubscribeHash, ttl, cooldown] = values as unknown as [string, string, string, string, number, number];
			expect(ttl).toBe(CONFIRMATION_TOKEN_TTL_SECONDS);
			expect(cooldown).toBe(CONFIRMATION_RESEND_COOLDOWN_SECONDS);
			const existing = subscribers.get(email);
			const conflict = query.split('ON CONFLICT')[1].split('RETURNING')[0];
			expect(conflict).not.toMatch(/confirm_token_hash\s*=|unsubscribe_token_hash\s*=|id\s*=/);
			expect(conflict).toContain('last_sent_at = NOW()');
			if (existing) {
				if (existing.status === 'active') return [];
				if (existing.lastSentAt !== null && existing.lastSentAt > now - cooldown * 1000) return [];
				existing.lastSentAt = now;
				return [{ id: existing.id, confirm_token_hash: existing.confirmHash }];
			}
			subscribers.set(email, { id, email, status: 'pending', confirmHash, unsubscribeHash, lastSentAt: now, confirmExpiresAt: now + ttl * 1000 });
			return [{ id, confirm_token_hash: confirmHash }];
		}
		if (query.includes('SET last_sent_at = NULL')) {
			const [id, previousHash] = values;
			const record = [...subscribers.values()].find((item) => item.id === id && item.confirmHash === previousHash && item.status !== 'active');
			if (record) record.lastSentAt = null;
			return [];
		}
		if (query.includes("SET status = 'pending'")) {
			expect(query).toContain('AND confirm_token_hash =');
			expect(query).toContain("AND status IN ('pending', 'unsubscribed')");
			const [confirmHash, unsubscribeHash, ttl, id, previousHash] = values as unknown as [string, string, number, string, string];
			const record = [...subscribers.values()].find((item) => item.id === id && item.confirmHash === previousHash && item.status !== 'active');
			if (!record) return [];
			Object.assign(record, { status: 'pending', confirmHash, unsubscribeHash, confirmExpiresAt: now + ttl * 1000 });
			return [{ id }];
		}
		if (query.includes("SET status = 'active'")) {
			expect(query).toContain('confirm_expires_at > NOW()');
			const record = [...subscribers.values()].find((item) => item.status === 'pending' && item.confirmHash === values[0] && item.confirmExpiresAt > now);
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

function pastCooldown(email: string) {
	subscribers.get(email)!.lastSentAt = Date.now() - CONFIRMATION_RESEND_COOLDOWN_SECONDS * 1000 - 1;
}

function subscribeEvent(body: BodyInit, contentType = 'application/json') {
	return { request: new Request('https://newsletter.hacker1db.dev/api/subscribe/', { method: 'POST', headers: { 'content-type': contentType }, body }) };
}

function event(email: unknown = 'test@example.com') {
	return subscribeEvent(JSON.stringify({ email }));
}

it('requires confirmation, suppresses unsubscribed records, and permits a fresh re-subscription', async () => {
	const first = await addSubscriber('test@example.com');
	expect(first).not.toBeNull();
	expect(await confirmSubscriber(first!.confirmationToken)).toBe(true);
	expect(await getConfirmedSubscribers()).toEqual([{ email: 'test@example.com', unsubscribeToken: first!.unsubscribeToken }]);
	expect(await unsubscribeSubscriber(first!.unsubscribeToken)).toBe(true);
	expect(await unsubscribeSubscriber(first!.unsubscribeToken)).toBe(true);
	expect(await getConfirmedSubscribers()).toEqual([]);
	pastCooldown('test@example.com');
	const resubscription = await addSubscriber('test@example.com');
	expect(resubscription!.confirmationToken).not.toBe(first!.confirmationToken);
	expect(await getConfirmedSubscribers()).toEqual([]);
	expect(await finalizeSubscription(resubscription!)).toBe(true);
	expect(await confirmSubscriber(resubscription!.confirmationToken)).toBe(true);
	expect(await getConfirmedSubscribers()).toHaveLength(1);
});

it('permits a new pending confirmation attempt after provider rejection', async () => {
	send.mockResolvedValueOnce({ data: null, error: { message: 'Rejected' } }).mockResolvedValueOnce({ data: { id: 'email_test' }, error: null });
	const original = await addSubscriber('test@example.com');
	pastCooldown('test@example.com');
	const { lastSentAt, ...originalRecord } = subscribers.get('test@example.com')!;
	expect((await subscribe(event() as never)).status).toBe(500);
	expect(subscribers.get('test@example.com')).toMatchObject(originalRecord);
	// A rejected send releases the cooldown, so the retry is not silently dropped.
	expect(subscribers.get('test@example.com')!.lastSentAt).toBeNull();
	expect((await subscribe(event() as never)).status).toBe(200);
	expect(send).toHaveBeenCalledTimes(2);
	expect(send.mock.calls[0][0].html).not.toBe(send.mock.calls[1][0].html);
	expect(subscribers.get('test@example.com')!.id).toBe(original!.subscriberId);
	expect(lastSentAt).toBeTypeOf('number');
});

it('allows an old pending link to confirm after replacement email fails', async () => {
	const original = await addSubscriber('test@example.com');
	pastCooldown('test@example.com');
	send.mockResolvedValue({ data: null, error: { message: 'Rejected' } });
	expect((await subscribe(event() as never)).status).toBe(500);
	expect(await confirmSubscriber(original!.confirmationToken)).toBe(true);
});

it('does not overwrite a subscription confirmed while replacement mail was sending', async () => {
	const original = await addSubscriber('test@example.com');
	pastCooldown('test@example.com');
	const replacement = await addSubscriber('test@example.com');
	expect(await confirmSubscriber(original!.confirmationToken)).toBe(true);
	expect(await finalizeSubscription(replacement!)).toBe(false);
	expect(await getConfirmedSubscribers()).toHaveLength(1);
});

it('sends at most one confirmation per address within the cooldown', async () => {
	send.mockResolvedValue({ data: { id: 'email_test' }, error: null });
	for (let i = 0; i < 5; i++) expect((await subscribe(event() as never)).status).toBe(200);
	expect(send).toHaveBeenCalledTimes(1);
	pastCooldown('test@example.com');
	expect((await subscribe(event() as never)).status).toBe(200);
	expect(send).toHaveBeenCalledTimes(2);
});

it('does not re-mail unsubscribed addresses within the cooldown', async () => {
	send.mockResolvedValue({ data: { id: 'email_test' }, error: null });
	const first = await addSubscriber('test@example.com');
	await finalizeSubscription(first!);
	expect(await unsubscribeSubscriber(first!.unsubscribeToken)).toBe(true);
	expect((await subscribe(event() as never)).status).toBe(200);
	expect(send).not.toHaveBeenCalled();
	expect(subscribers.get('test@example.com')!.status).toBe('unsubscribed');
});

it('returns the same response for new, pending, and active addresses', async () => {
	send.mockResolvedValue({ data: { id: 'email_test' }, error: null });
	const active = await addSubscriber('active@example.com');
	await confirmSubscriber(active!.confirmationToken);
	const bodies = [];
	for (const email of ['new@example.com', 'new@example.com', 'active@example.com']) {
		const response = await subscribe(event(email) as never);
		expect(response.status).toBe(200);
		bodies.push(await response.json());
	}
	expect(new Set(bodies.map((body) => JSON.stringify(body))).size).toBe(1);
});

it.each([
	[{ email: ['a@example.com'] }], [{ email: { toLowerCase: 1 } }], [{ email: 42 }], [{}], [null], [['a@example.com']]
])('rejects a non-string email %j with 400', async (body) => {
	const response = await subscribe(subscribeEvent(JSON.stringify(body)) as never);
	expect(response.status).toBe(400);
	expect(send).not.toHaveBeenCalled();
});

it('rejects malformed JSON, file uploads, and over-long addresses with 400', async () => {
	expect((await subscribe(subscribeEvent('{') as never)).status).toBe(400);
	const form = new FormData();
	form.set('email', new File(['x'], 'a.txt'));
	expect((await subscribe({ request: new Request('https://newsletter.hacker1db.dev/api/subscribe/', { method: 'POST', body: form }) } as never)).status).toBe(400);
	expect((await subscribe(event(`${'a'.repeat(250)}@example.com`) as never)).status).toBe(400);
});

it('rejects expired confirmation links', async () => {
	const pending = await addSubscriber('test@example.com');
	subscribers.get('test@example.com')!.confirmExpiresAt = Date.now() - 1;
	expect(await confirmSubscriber(pending!.confirmationToken)).toBe(false);
});
