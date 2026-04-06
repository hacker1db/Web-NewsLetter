import { createClient, type Client } from '@libsql/client';
import { env } from '$env/dynamic/private';

let _db: Client | null = null;

function getDb(): Client {
	if (!_db) {
		const url = env.TURSO_DATABASE_URL;
		const authToken = env.TURSO_AUTH_TOKEN;
		if (!url || !authToken) {
			throw new Error('TURSO_DATABASE_URL and TURSO_AUTH_TOKEN must be set');
		}
		_db = createClient({ url, authToken });
	}
	return _db;
}

export async function addSubscriber(email: string, token: string): Promise<void> {
	await getDb().execute({
		sql: 'INSERT INTO subscribers (email, token, confirmed, created_at) VALUES (?, ?, 0, datetime("now"))',
		args: [email, token]
	});
}

export async function confirmSubscriber(token: string): Promise<boolean> {
	const result = await getDb().execute({
		sql: 'UPDATE subscribers SET confirmed = 1 WHERE token = ? AND confirmed = 0',
		args: [token]
	});
	return (result.rowsAffected ?? 0) > 0;
}

export async function removeSubscriber(token: string): Promise<boolean> {
	const result = await getDb().execute({
		sql: 'DELETE FROM subscribers WHERE token = ?',
		args: [token]
	});
	return (result.rowsAffected ?? 0) > 0;
}

export async function getConfirmedSubscribers(): Promise<{ email: string; token: string }[]> {
	const result = await getDb().execute('SELECT email, token FROM subscribers WHERE confirmed = 1');
	return result.rows.map((row) => ({
		email: row.email as string,
		token: row.token as string
	}));
}

export async function getSubscriberCount(): Promise<number> {
	const result = await getDb().execute('SELECT COUNT(*) as count FROM subscribers WHERE confirmed = 1');
	return Number(result.rows[0].count);
}
