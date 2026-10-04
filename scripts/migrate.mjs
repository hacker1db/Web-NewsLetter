import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
	throw new Error('DATABASE_URL must be set before running migrations');
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const migration = await readFile(resolve(scriptDirectory, '../deployment/schema.sql'), 'utf8');
const sql = neon(process.env.DATABASE_URL);

// The schema is idempotent, which makes this safe for initial setup and CI.
// Execute statements separately because the Neon HTTP driver accepts one statement per query.
for (const statement of migration.split(';').map((value) => value.trim()).filter(Boolean)) {
	await sql.query(statement);
}
console.log('Newsletter database schema is up to date.');
