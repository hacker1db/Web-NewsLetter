# Newsletter subscriber and unsubscribe plan

## Goal

Run a clean-slate newsletter subscriber list on a dedicated Neon Postgres
database connected to this Vercel project. Subscribers can confirm their
subscription, unsubscribe from every email, and re-subscribe only by completing
a new confirmation step.

There is no Turso-data migration in scope. The new database begins empty.

## How the finished flow works

1. A visitor submits an email address on the newsletter site.
2. The server normalizes the address, creates a pending subscriber record, and
   sends a confirmation email.
3. The confirmation link activates the subscription.
4. An admin send selects only active subscribers. Every message includes an
   individual unsubscribe link and email-client unsubscribe headers.
5. An unsubscribe request marks the record `unsubscribed`; it does not delete
   the record. This keeps a durable suppression record so the address is not
   accidentally mailed again.
6. A previously unsubscribed person can submit the form again, but must confirm
   the newly sent email before messages resume.

## Data model

`subscribers` is the system of record. It contains:

| Field | Purpose |
| --- | --- |
| `id` | Internal subscriber identifier |
| `email` | Normalized, unique email address |
| `status` | `pending`, `active`, or `unsubscribed` |
| `confirm_token_hash` | Hash of the one-time confirmation token |
| `unsubscribe_token_hash` | Hash of the unsubscribe token |
| `created_at`, `confirmed_at`, `unsubscribed_at` | Lifecycle timestamps |

The raw tokens are only sent in email links. Database records retain hashes, so
a database export cannot be used directly to unsubscribe or confirm an address.

## Implementation deliverables

- [x] Replace the Turso client with `@neondatabase/serverless` and `DATABASE_URL`.
- [x] Add an idempotent SQL schema migration and `pnpm db:migrate` command.
- [x] Implement the pending/active/unsubscribed lifecycle.
- [x] Hash subscription tokens and use separate confirmation and unsubscribe tokens.
- [x] Send newsletters only to active subscribers.
- [x] Make unsubscribe durable and idempotent, including one-click email-client support.
- [x] Add `List-Unsubscribe` and `List-Unsubscribe-Post` headers.
- [x] Update the local environment template, deployment notes, and automated tests.

## Vercel setup required before deployment

1. Open the **newsletter** Vercel project (not Plan Manager).
2. Install or create a new Neon Postgres resource through the Vercel Marketplace.
   Do not attach the newsletter to Plan Manager's database.
3. Confirm Vercel provides `DATABASE_URL` to the newsletter project's Production
   environment.
4. Add these Production environment variables:

   ```text
   DATABASE_URL=<provided by Neon>
   SUBSCRIBER_TOKEN_SECRET=<new random secret, 32+ bytes>
   RESEND_API_KEY=<existing Resend API key>
   PUBLIC_SITE_URL=https://newsletter.hacker1db.dev
   ```

5. Pull those values locally only if local testing against the database is
   needed. Never commit `.env.local` or any secret value.
6. Run `pnpm db:migrate` once with `DATABASE_URL` available.
7. Deploy and exercise the verification checklist below.

## Verification checklist

- [ ] Subscribe with a test mailbox and receive a confirmation email.
- [ ] Confirm the subscription and verify the admin count increases.
- [ ] Send a test issue and verify its footer and native unsubscribe affordance.
- [ ] Unsubscribe through the email link; repeat the request and confirm it stays
      successful without changing state incorrectly.
- [ ] Confirm that a new send excludes the unsubscribed address.
- [ ] Subscribe again with that address and require confirmation before it is
      included in sends.
- [ ] Confirm the production Vercel environment exposes no database or Resend
      secret to the browser.

## Operational notes

- This application remains the subscriber source of truth. Resend sends the
  messages; it does not need to become the contact-list owner for this design.
- Keep the database dedicated to the newsletter for least privilege and an easy
  lifecycle independent of Plan Manager.
- Treat `SUBSCRIBER_TOKEN_SECRET` as a long-lived secret. Rotating it will
  invalidate existing confirmation and unsubscribe links unless a key-rotation
  strategy is added.
