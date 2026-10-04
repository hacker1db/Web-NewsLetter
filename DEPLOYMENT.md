# Vercel Deployment

## Project Settings

- Git repository: `hacker1db/Web-NewsLetter`
- Production branch: `main`
- Framework: SvelteKit
- Root directory: repository root (`.`), not the local `main/` worktree folder
- Node.js version: 22.x (matches `svelte.config.js`)
- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm build`
- Output directory: framework default

Import the Git repository into Vercel to enable deployment after merges to `main`.

## Production Environment

Configure these in Vercel before deploying. Keep secret values out of Git.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Neon Postgres connection string injected by the Vercel integration |
| `SUBSCRIBER_TOKEN_SECRET` | A stable, high-entropy secret for signing unsubscribe URLs |
| `RESEND_API_KEY` | Email delivery API key |
| `CLERK_SECRET_KEY` | Clerk server verification key |
| `VITE_CLERK_PUBLISHABLE_KEY` | Matching Clerk client key; required at build time |
| `ADMIN_USER_IDS` | Comma-separated Clerk user IDs allowed to administer the newsletter |
| `CLERK_AUTHORIZED_PARTIES` | `https://newsletter.hacker1db.dev` |
| `PUBLIC_SITE_URL` | Canonical site origin: `https://newsletter.hacker1db.dev` |
| `PUBLIC_BLOG_URL` | Blog origin, `https://hacker1db.dev` |

Admin access is denied when `ADMIN_USER_IDS` is empty. Obtain your user ID from
the production Clerk instance. Follow `.env.example` for optional verification
settings. Redeploy after changing environment variables; the Clerk client key
is embedded during the build.

## Service Setup

1. Add a dedicated Neon Postgres integration to this Vercel project (do not share Plan Manager's database) and verify it provides `DATABASE_URL`.
2. Generate and add `SUBSCRIBER_TOKEN_SECRET` (for example, `openssl rand -base64 48`). Keep this value stable after launch so historical unsubscribe links remain valid.
3. With the production `DATABASE_URL` available locally or in a secure CI job, run `pnpm db:migrate`. The migration is idempotent and is intentionally not run during deployment.
4. Verify `hacker1db.dev` in Resend. The application sends from `newsletter@hacker1db.dev`.
5. Configure a production Clerk instance and its allowed domain. Use matching production keys and configure any enabled social sign-in providers.
6. Add the canonical domain to the Vercel project and apply the DNS records Vercel provides. Set `PUBLIC_SITE_URL` to that domain once it resolves.
7. Use separate database/email/auth configuration for previews if preview deployments need working integrations.

## Newsletter Domain

Add `newsletter.hacker1db.dev` to the newsletter project's production domains.
Use the CNAME target shown by Vercel for that project. At the domain's DNS
provider, replace address records for the `newsletter` host with this CNAME;
leave the root domain and email records in place. Verify the domain and HTTPS
certificate in Vercel before sending confirmation emails.

DNS inspection on October 4, 2026 found three existing A records for this
subdomain and no CNAME. DNS changes have not been applied.

## Launch Verification

1. Open the production home page and confirm recent blog posts load.
2. Confirm `/admin` requires login and that a non-admin cannot send newsletters through either `/admin?/send` or `/api/send`.
3. Subscribe with an address you control, receive the confirmation email, and follow its link.
4. Verify the subscriber becomes `active` in Postgres and appears in the admin count.
5. Send a test newsletter to your test subscriber and verify the result and unsubscribe link.

Bulk sending currently runs inside one HTTP request. Check provider rate limits and Vercel execution limits before sending to a large subscriber list.
