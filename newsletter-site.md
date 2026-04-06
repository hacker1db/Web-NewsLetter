# Plan: Standalone Newsletter Site — newsletter.hacker1db.dev

**Created:** 2026-03-26
**Status:** Draft
**Scope:** Separate repo, landing page + full subscribe/send backend + login-protected admin

---

## Requirements Summary

Build a standalone, visually stunning newsletter site at `newsletter.hacker1db.dev` that:
- Matches the hacker1db.dev terminal/dark aesthetic (bg `#1a1d21`, accent `#6FC1FF`, Inter font)
- Lives in its own repo and deploys independently on Vercel
- Has a working subscribe form (Resend + Turso backend)
- Pulls recent posts from the main blog (via a public JSON endpoint or RSS)
- Includes social links
- Has a login-protected `/admin` page to compose and send newsletter issues
- Supports double opt-in and unsubscribe flows

---

## Resend Pricing Reference

| Plan     | Price   | Emails/mo | Emails/day | Domains | Notes                          |
|----------|---------|-----------|------------|---------|--------------------------------|
| Free     | $0/mo   | 3,000     | 100        | 1       | Great for getting started      |
| Pro      | $20/mo  | 50,000    | unlimited  | 10      | ~$0.40/1k after 50k included   |
| Scale    | $90/mo  | 100,000+  | unlimited  | unlimited | Volume discounts              |

**Recommendation:** Start on Free. Welcome and confirm emails (1 per signup) are fine on Free up to 100 new signups/day. Upgrade to Pro **before your first blast send to >100 confirmed subscribers** — a single blast to 101+ people will hit the 100/day ceiling mid-send. Verify your domain in Resend dashboard before first send for deliverability.

---

## Acceptance Criteria

- [ ] Visitor can submit email and receive a welcome email within 30s
- [ ] Double opt-in: subscriber marked `confirmed=0` until they click confirmation link
- [ ] Duplicate email submission returns a graceful error message (not a crash)
- [ ] Page scores 90+ on Lighthouse performance (static-first, minimal JS)
- [ ] Page visually matches hacker1db.dev: bg `#1a1d21`, accent `#6FC1FF`, font Inter
- [ ] Terminal cursor blink animation present in hero section
- [ ] Recent posts section shows ≥3 posts from blog (graceful fallback if API is down)
- [ ] Social links (GitHub, YouTube, Twitch, Twitter/X, Blog) resolve correctly
- [ ] Unsubscribe link in every email works (token-based `GET /api/unsubscribe?token=...`)
- [ ] `/admin` redirects to `/login` when no valid session cookie present
- [ ] Admin login accepts only the correct `ADMIN_PASSWORD`, sets HttpOnly session cookie
- [ ] Admin page shows subscriber count and a compose + send UI
- [ ] `POST /api/send` rejects requests without a valid session (401)
- [ ] Site deploys via Vercel on push to `main`
- [ ] `newsletter.hacker1db.dev` DNS CNAME points to Vercel deployment

---

## Tech Stack

| Layer     | Choice              | Reason                                     |
|-----------|---------------------|--------------------------------------------|
| Framework | SvelteKit 2.x       | Familiar, SSR+static hybrid, fast          |
| Styling   | Tailwind CSS 4.x    | Matches main blog toolchain                |
| Email     | Resend              | Free tier generous, great DX               |
| Database  | Turso (libSQL)      | Lightweight, serverless-friendly, free tier |
| Auth      | Clerk + Discord OAuth   | Managed auth, Discord social login, no password to store |
| Deploy    | Vercel              | Same platform as main blog                 |
| DNS       | Existing domain     | Add subdomain CNAME to Vercel              |

---

## Page Layout

```
newsletter.hacker1db.dev
┌─────────────────────────────────────────────┐
│  HERO                                       │
│  $ subscribe --to hacker1db▋               │
│  "Security posts, dev notes, hacker stuff   │
│   delivered to your inbox."                 │
│                                             │
│  [  your@email.com        ] [Subscribe →]   │
│  ✓ No spam. Unsubscribe anytime.            │
│  Join 47 readers  (shown only when ≥ 10)   │
├─────────────────────────────────────────────┤
│  RECENT POSTS (fetched from blog API)       │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │ Post 1  │ │ Post 2  │ │ Post 3  │      │
│  └─────────┘ └─────────┘ └─────────┘      │
├─────────────────────────────────────────────┤
│  ABOUT                                      │
│  [avatar] Self-taught hacker, lover of      │
│           coding. Writing about security,   │
│           tools, and the craft.             │
├─────────────────────────────────────────────┤
│  SOCIAL LINKS                               │
│  GitHub  YouTube  Twitch  Twitter  Blog     │
└─────────────────────────────────────────────┘
```

---

## Repository Structure

```
hacker1db-newsletter/              ← new standalone repo
├── src/
│   ├── routes/
│   │   ├── +page.svelte           ← landing page (hero + form + posts + social)
│   │   ├── +page.server.ts        ← SSR: load recent posts from blog API
│   │   ├── success/
│   │   │   └── +page.svelte       ← "Check your inbox!" confirmation page
│   │   ├── confirm/
│   │   │   └── +page.server.ts    ← GET ?token=: mark confirmed=1
│   │   ├── login/
│   │   │   └── +page.svelte       ← Clerk <SignIn /> component (Discord OAuth button)
│   │   ├── admin/
│   │   │   ├── +layout.server.ts  ← Auth guard: read Clerk session via locals.auth()
│   │   │   ├── +page.svelte       ← Compose subject + HTML body, send button, subscriber count
│   │   │   └── +page.server.ts    ← Load subscriber count; handle send form action
│   │   └── api/
│   │       ├── subscribe/
│   │       │   └── +server.ts     ← POST: validate → dedupe → insert → send welcome
│   │       ├── confirm/
│   │       │   └── +server.ts     ← GET ?token=: set confirmed=1
│   │       ├── unsubscribe/
│   │       │   └── +server.ts     ← GET ?token=: delete subscriber row
│   │       ├── send/
│   │       │   └── +server.ts     ← POST (session-protected): batch send to confirmed subscribers
│   │       └── logout/
│   │           └── +server.ts     ← POST: Clerk signOut() redirect
│   ├── hooks.server.ts            ← Clerk middleware (protects /admin/* routes)
│   ├── lib/
│   │   ├── server/
│   │   │   ├── db.ts              ← Turso libSQL client + helpers
│   │   │   └── resend.ts          ← Resend client, sendWelcome(), sendNewsletter()
│   │   └── emails/
│   │       ├── welcome.ts         ← Welcome + confirmation link HTML (inline styles)
│   │       └── newsletter.ts      ← Newsletter issue HTML template (inline styles)
│   ├── components/
│   │   ├── Hero.svelte            ← Terminal hero with blinking cursor
│   │   ├── SubscribeForm.svelte   ← Email input + submit + error/success states
│   │   ├── RecentPosts.svelte     ← Post cards fetched from blog
│   │   └── SocialLinks.svelte     ← Icon row
│   └── app.css                    ← Global styles (matches hacker1db.dev palette)
├── static/
│   └── avatar.png
├── .env.example
├── package.json
├── svelte.config.js
├── tailwind.config.js
└── vercel.json
```

---

## Database Schema

```sql
CREATE TABLE subscribers (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  email       TEXT UNIQUE NOT NULL,
  confirmed   INTEGER DEFAULT 0,        -- 0 = pending, 1 = confirmed
  token       TEXT NOT NULL,            -- used for confirm + unsubscribe links
  created_at  TEXT DEFAULT (datetime('now'))
);
```

---

## Key Routes & Endpoint Logic

### `GET / POST /` — Landing page
- SSR loads 3 recent posts from `hacker1db.dev/api/posts.json`
- Form POSTs to `/api/subscribe`

### `POST /api/subscribe`
1. Validate email format (regex)
2. Check for duplicate (return friendly error if exists)
3. Generate token via `crypto.randomUUID()`
4. Insert into `subscribers` table (`confirmed=0`)
5. Send welcome email with confirmation link via Resend
6. Redirect to `/success`

### `GET /api/confirm?token=`
1. Look up subscriber by token
2. Set `confirmed=1`
3. Redirect to `/` with `?confirmed=true` flash message

### `GET /api/unsubscribe?token=`
1. Look up subscriber by token
2. Delete row
3. Render inline "You've been unsubscribed" confirmation

### `GET /login`
- Renders Clerk `<SignIn />` component configured with Discord as the only social provider
- Clerk handles the OAuth redirect, token exchange, and session cookie automatically
- On success: Clerk redirects to `/admin`

### `GET /admin` (protected by `+layout.server.ts`)
- Auth guard: `const { userId } = locals.auth()` → redirect to `/login` if null
- Load confirmed subscriber count from DB
- Render compose form: subject + HTML body textarea + "Send" button

### `POST /api/send` (Clerk-protected)
1. Verify Clerk session via `locals.auth()` (reject 401 if no `userId`)
2. Accept `{ subject, htmlBody }` from form
3. Fetch all `confirmed=1` subscribers from DB
4. Send via Resend (batch, respecting 100/day free tier limit)
5. Log send results; return success/error

### `POST /api/logout`
1. Call Clerk `signOut()` (invalidates session server-side)
2. Redirect to `/login`

---

## Email Templates

Build as TypeScript functions returning HTML strings. All styles must be **inline** — email clients strip external CSS.

**`welcome.ts`** — triggered on signup:
- Subject: "Confirm your subscription to hacker1db"
- Body: confirmation link (`/api/confirm?token=...`), unsubscribe link
- Keep minimal: dark bg, cyan CTA button, Inter-equivalent web-safe font stack

**`newsletter.ts`** — triggered via `/admin` send:
- Subject: passed in from admin compose form
- Body: passed in as HTML; wrapped in branded container
- Footer: always includes unsubscribe link (`/api/unsubscribe?token=...`)

---

## Implementation Phases

### Phase 1 — Repo & Scaffold
- [x] ~~`bun create svelte@latest hacker1db-newsletter` (SvelteKit skeleton, TypeScript)~~
- [x] ~~`bun add -d @tailwindcss/vite tailwindcss`~~
- [x] ~~`bun add resend @libsql/client`~~
- [x] ~~Copy color palette + Inter font setup from main blog into `src/app.css`~~
- [ ] Commit initial scaffold, push to GitHub, connect to Vercel
- [ ] Add `newsletter.hacker1db.dev` CNAME in DNS → Vercel

### Phase 2 — Visual Design
- [x] ~~`Hero.svelte`: terminal heading `$ subscribe --to hacker1db▋`, CSS `@keyframes blink` cursor, tagline, form slot~~
- [x] ~~`SubscribeForm.svelte`: email input + cyan submit button, Svelte `$state` for loading/error/success~~
- [x] ~~`RecentPosts.svelte`: 3-col responsive grid, `.post-card` style (bg `#111827`, border `#374151`, hover accent)~~
- [x] ~~`SocialLinks.svelte`: GitHub, YouTube, Twitch, Twitter/X, Blog icon row~~
- [ ] About section: circular avatar, bio text
- [x] ~~`+page.server.ts`: fetch 3 posts from `hacker1db.dev/api/posts.json`, graceful fallback on error~~
- [x] ~~Responsive: mobile-first, 768px breakpoint (3-col → 1-col)~~
- [x] ~~`/success` page: terminal-style "message sent" confirmation~~

### Phase 3 — Subscribe Backend
- [ ] Create Turso DB: `turso db create hacker1db-newsletter`
- [ ] Run schema migration (see Database Schema above)
- [x] ~~`src/lib/server/db.ts`: client init, `addSubscriber()`, `confirmSubscriber(token)`, `removeSubscriber(token)`, `getConfirmedSubscribers()`, `getSubscriberCount()`~~
- [x] ~~`src/lib/server/resend.ts`: Resend client, `sendWelcomeEmail(email, token)`, `sendNewsletterEmail(subscribers, subject, html)`~~
- [x] ~~`src/lib/emails/welcome.ts`: inline HTML with confirmation + unsubscribe links~~
- [x] ~~`src/lib/emails/newsletter.ts`: inline HTML wrapper with unsubscribe footer~~
- [x] ~~`POST /api/subscribe` endpoint (full flow per spec above)~~
- [x] ~~`GET /api/confirm?token=` endpoint~~
- [x] ~~`GET /api/unsubscribe?token=` endpoint~~

### Phase 4 — Admin & Auth (Clerk + Discord)
- [x] ~~`bun add @clerk/clerk-js` (v6.3.3 installed)~~
- [ ] Create Clerk application; enable **Discord** as the only social provider in Clerk dashboard
- [ ] Set Clerk redirect URL: after sign-in → `/admin`
- [x] ~~`src/hooks.server.ts`: reads `admin_session` HttpOnly cookie → sets `locals.userId`~~
- [x] ~~`/login/+page.svelte`: full Clerk JS integration — loads UI bundle, mounts SignIn, verifies session via `/api/auth/`, redirects to `/admin/`~~
- [x] ~~`/api/auth/+server.ts`: POST — decodes JWT, verifies session via Clerk REST API, sets HttpOnly `admin_session` cookie~~
- [x] ~~`src/app.d.ts`: `App.Locals` typed with `userId?: string`~~
- [x] ~~`/admin/+layout.server.ts`: `const { userId } = locals.auth(); if (!userId) redirect(302, '/login')`~~
- [x] ~~`/admin/+page.svelte`: subscriber count display, subject + body compose form, Send button~~
- [x] ~~`/admin/+page.server.ts`: `load()` fetches subscriber count; `send` form action triggers `/api/send`~~
- [x] ~~`POST /api/send`: auth guard + Resend batch send~~
- [x] ~~`POST /api/logout`: redirect to `/login`~~

### Phase 5 — Polish & Deploy
- [x] ~~Add `.env.example` (all vars documented)~~
- [ ] Add all env vars to Vercel project settings
- [ ] Test full flow: subscribe → confirm email → admin login → compose → send → unsubscribe
- [ ] Lighthouse audit ≥ 90 performance, ≥ 90 accessibility
- [ ] Add "Newsletter" link to main blog's footer/nav (separate PR in main blog repo)
- [x] ~~(Optional) Show subscriber count in hero: "Join X readers" — only render when confirmed count ≥ 10~~

---

## Environment Variables

```env
# Email
RESEND_API_KEY=re_...

# Database
TURSO_DATABASE_URL=libsql://hacker1db-newsletter-...turso.io
TURSO_AUTH_TOKEN=...

# Clerk auth
PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...

# Public URLs
PUBLIC_BLOG_URL=https://hacker1db.dev
PUBLIC_SITE_URL=https://newsletter.hacker1db.dev
```

---

## Blog API Dependency

The "Recent Posts" section fetches from the main blog.

**Option A (preferred):** Add `GET /api/posts.json` to the main blog (`src/routes/api/posts.json/+server.ts`) returning the 3 most recent posts:
```json
[{ "title": "...", "slug": "...", "date": "...", "tags": ["..."] }]
```

**Option B (fallback):** Parse `hacker1db.dev/rss.xml` in `+page.server.ts`. No main blog changes needed, slightly slower.

Implement Option A first (trivial addition to main blog repo).

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Blog API down → posts section broken | `try/catch` in `+page.server.ts`; render static "Visit the blog →" fallback card |
| Turso cold start on subscribe | `@libsql/client` libsql:// URL; keep warm via periodic ping or upgrade to Turso Pro |
| Resend 100/day free tier limit | Acceptable to ~100 subscribers; upgrade to Pro ($20/mo) before any blast send |
| DNS propagation delay | Set up Vercel project first, then point DNS; expect up to 24hr |
| Discord account compromised | Clerk handles MFA options; enable 2FA on Discord account |
| Clerk outage blocks admin access | Rare; Clerk has 99.99% SLA. Fallback: use Resend API directly if urgent |
| Repo style drift from main blog | Keep shared colors in a single `app.css`; no npm package needed |
| Unconfirmed spam signups | Double opt-in (confirmed=0 until email click) keeps list clean |

---

## Verification Steps

1. `bun run dev` → site at localhost:5173, correct colors (#1a1d21 bg, #6FC1FF accent), Inter font, blinking cursor
2. Submit valid email → `/success` page, welcome email with confirm link received
3. Click confirm link → `confirmed=1` in Turso, redirected to homepage with confirmation message
4. Submit same email again → graceful "Already subscribed" error, no DB insert
5. Submit invalid email → inline form error, no API call
6. Navigate to `/admin` without login → redirected to `/login`
7. `/login` shows Discord OAuth button via Clerk `<SignIn />`
8. Click "Continue with Discord" → OAuth flow completes → redirected to `/admin`, subscriber count visible
9. Compose + send → Resend delivers email to confirmed subscribers within 60s
10. Click unsubscribe link in received email → row deleted from Turso, confirmation shown
11. `POST /api/send` without session cookie → `401 Unauthorized`
12. `hacker1db.dev/api/posts.json` available → 3 post cards render on page
13. `hacker1db.dev/api/posts.json` unavailable → fallback card renders, no crash
14. Lighthouse: Performance ≥ 90, Accessibility ≥ 90
15. DNS: `dig newsletter.hacker1db.dev` resolves to Vercel

---

## Notes

- **No separate repo needed for email.** Resend handles delivery; no SMTP server needed.
- **Keep email templates simple.** Heavily styled HTML breaks in Gmail/Outlook. Minimal inline styles win.
- **Don't store sensitive data.** Email + token only — no names, no PII beyond what's needed.
- **Verify your domain in Resend** before first send — improves deliverability significantly.
- **100/day Resend limit on Free tier.** If list grows past ~100, batch sends or upgrade before blast.

---

## ADR

**Decision:** Standalone SvelteKit repo on Vercel with session-cookie admin auth
**Drivers:** Design independence, separate deploy cadence, full aesthetic control, no third-party lock-in
**Alternatives considered:**
- Integrated into main blog (`/newsletter` route) — rejected: couples newsletter deploy to blog, harder to iterate UI independently
- Beehiiv with custom CSS — rejected: limited terminal aesthetic control, animations impossible, font loading unreliable
- Buttondown/ConvertKit — rejected: third-party lock-in, can't fully match hacker1db design
- Password + session cookie — rejected: password to manage, no MFA, more code to maintain
- JWT-based auth — rejected: overkill for single-user admin

**Why chosen:** Full design control, familiar SvelteKit/Vercel stack, separate repo = independent iteration. Clerk + Discord = zero auth code to maintain, MFA via Discord, familiar login flow for the owner.
**Consequences:** Two repos to maintain; main blog needs a small `api/posts.json` endpoint; DNS change needed.
**Follow-ups:** `/issues` archive page; subscriber count badge on blog footer; double opt-in resend flow.

---

## Changelog
- Initial draft from conversation requirements
- Added admin login + session auth (user request)
- Merged NEWSLETTER_PLAN.md: Resend pricing, SEND_SECRET endpoint spec, double opt-in, email template details, full env vars, notes
- Replaced password/session auth with Clerk + Discord OAuth
- Clarified Resend upgrade threshold: Free is fine for welcome/confirm emails; upgrade before first blast to >100 confirmed subscribers
- Added optional public subscriber count to hero (gated at ≥ 10 to avoid social-proof backfire)
- NEWSLETTER_PLAN.md retired — this document is now the single authoritative plan
