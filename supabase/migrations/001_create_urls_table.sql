-- ============================================================
-- URL Shortener Schema
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS urls (
  id          BIGSERIAL PRIMARY KEY,
  short_code  VARCHAR(11)  UNIQUE NOT NULL,
  original_url TEXT        NOT NULL,
  expires_at  TIMESTAMPTZ,
  click_count BIGINT       NOT NULL DEFAULT 0,
  is_active   BOOLEAN      NOT NULL DEFAULT TRUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Fast lookup by short code (the hot path on every redirect)
CREATE INDEX IF NOT EXISTS idx_urls_short_code ON urls (short_code);

-- Useful for dashboard queries sorted by recency
CREATE INDEX IF NOT EXISTS idx_urls_created_at ON urls (created_at DESC);

-- Skip expired / deactivated rows quickly
CREATE INDEX IF NOT EXISTS idx_urls_is_active  ON urls (is_active);

-- ── Atomic click-count increment ────────────────────────────
-- Called fire-and-forget from the redirect handler so the hot
-- path never waits for the write to complete.
CREATE OR REPLACE FUNCTION increment_click_count(code VARCHAR)
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE urls
  SET click_count = click_count + 1,
      updated_at  = NOW()
  WHERE short_code = code
    AND is_active  = TRUE;
END;
$$;

-- ── Auto-update updated_at ───────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER urls_set_updated_at
  BEFORE UPDATE ON urls
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- ── Row Level Security ───────────────────────────────────────
-- Enable RLS; the server uses the service-role key which bypasses
-- RLS. Add per-user policies here once you wire up auth.
ALTER TABLE urls ENABLE ROW LEVEL SECURITY;

-- Allow anonymous reads (redirects work even without a session)
CREATE POLICY "public_read"
  ON urls FOR SELECT
  USING (true);

-- Service role key (used by the Next.js API routes) bypasses RLS automatically.
-- If you add Supabase Auth, replace the policies below:
-- CREATE POLICY "owner_write" ON urls FOR ALL USING (auth.uid() = user_id);
