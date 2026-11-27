-- Initial newsletter Postgres schema. Applied by `pnpm db:migrate`.
CREATE TABLE IF NOT EXISTS subscribers (
  id UUID PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'unsubscribed')),
  confirm_token_hash TEXT NOT NULL,
  unsubscribe_token_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  confirmed_at TIMESTAMPTZ,
  unsubscribed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS subscribers_active_created_at_idx
  ON subscribers (created_at) WHERE status = 'active';

-- Confirmation emails: per-address resend cooldown and confirmation-link expiry.
-- Rows created before this migration have no expiry, so their old links fail closed;
-- those addresses can subscribe again to receive a new link.
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMPTZ;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS confirm_expires_at TIMESTAMPTZ;
