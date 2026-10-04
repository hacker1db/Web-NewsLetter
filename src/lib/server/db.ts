import { createHash, createHmac, randomBytes, randomUUID } from 'node:crypto';
import { neon } from '@neondatabase/serverless';
import { env } from '$env/dynamic/private';

type Sql = ReturnType<typeof neon>;

let database: Sql | null = null;

function getDb(): Sql {
	if (!database) {
		if (!env.DATABASE_URL) throw new Error('DATABASE_URL must be set');
		database = neon(env.DATABASE_URL);
	}
	return database;
}

function getTokenSecret(): string {
	if (!env.SUBSCRIBER_TOKEN_SECRET) throw new Error('SUBSCRIBER_TOKEN_SECRET must be set');
	return env.SUBSCRIBER_TOKEN_SECRET;
}

function hashToken(token: string): string {
	return createHash('sha256').update(token).digest('hex');
}

function createConfirmationToken(): string {
	return randomBytes(32).toString('base64url');
}

/** A deterministic signed token keeps old newsletter links usable; only its hash is persisted. */
function createUnsubscribeToken(subscriberId: string): string {
	const signature = createHmac('sha256', getTokenSecret()).update(subscriberId).digest('base64url');
	return `${subscriberId}.${signature}`;
}

export type SubscriptionTokens = {
	confirmationToken: string;
	unsubscribeToken: string;
	subscriberId: string;
	previousConfirmationHash: string;
};

export async function addSubscriber(email: string): Promise<SubscriptionTokens | null> {
	const id = randomUUID();
	const confirmationToken = createConfirmationToken();
	const unsubscribeToken = createUnsubscribeToken(id);

	// Keep pending tokens and suppression unchanged until Resend accepts replacement mail.
	const rows = (await getDb()`
		INSERT INTO subscribers (
			id, email, status, confirm_token_hash, unsubscribe_token_hash, created_at, confirmed_at, unsubscribed_at
		) VALUES (
			${id}, ${email}, 'pending', ${hashToken(confirmationToken)}, ${hashToken(unsubscribeToken)}, NOW(), NULL, NULL
		)
		ON CONFLICT (email) DO UPDATE SET
			email = EXCLUDED.email
		WHERE subscribers.status IN ('pending', 'unsubscribed')
		RETURNING id, confirm_token_hash
	`) as { id: string; confirm_token_hash: string }[];
	if (!rows.length) return null;
	return {
		confirmationToken, unsubscribeToken: createUnsubscribeToken(rows[0].id),
		subscriberId: rows[0].id, previousConfirmationHash: rows[0].confirm_token_hash
	};
}

export async function finalizeSubscription(tokens: SubscriptionTokens): Promise<boolean> {
	const rows = (await getDb()`
		UPDATE subscribers
		SET status = 'pending', confirm_token_hash = ${hashToken(tokens.confirmationToken)},
			unsubscribe_token_hash = ${hashToken(tokens.unsubscribeToken)},
			confirmed_at = NULL, unsubscribed_at = NULL
		WHERE id = ${tokens.subscriberId} AND confirm_token_hash = ${tokens.previousConfirmationHash}
			AND status IN ('pending', 'unsubscribed')
		RETURNING id
	`) as { id: string }[];
	return rows.length > 0;
}

export async function confirmSubscriber(token: string): Promise<boolean> {
	const rows = (await getDb()`
		UPDATE subscribers
		SET status = 'active', confirmed_at = NOW()
		WHERE status = 'pending' AND confirm_token_hash = ${hashToken(token)}
		RETURNING id
	`) as { id: string }[];
	return rows.length > 0;
}

/** Marks a subscriber suppressed without deleting its record. Repeated visits succeed. */
export async function unsubscribeSubscriber(token: string): Promise<boolean> {
	const rows = (await getDb()`
		UPDATE subscribers
		SET status = 'unsubscribed', unsubscribed_at = COALESCE(unsubscribed_at, NOW())
		WHERE unsubscribe_token_hash = ${hashToken(token)}
		RETURNING id
	`) as { id: string }[];
	return rows.length > 0;
}

export async function getConfirmedSubscribers(): Promise<{ email: string; unsubscribeToken: string }[]> {
	const rows = (await getDb()`
		SELECT id, email FROM subscribers WHERE status = 'active' ORDER BY created_at ASC
	`) as { id: string; email: string }[];
	return rows.map((row) => ({ email: row.email, unsubscribeToken: createUnsubscribeToken(row.id) }));
}

export async function getSubscriberCount(): Promise<number> {
	const rows = (await getDb()`
		SELECT COUNT(*)::text AS count FROM subscribers WHERE status = 'active'
	`) as { count: string }[];
	return Number(rows[0]?.count ?? 0);
}
