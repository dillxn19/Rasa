-- ============================================================
-- MIGRATION 022: Invite-only signup gate (referral code required)
-- ============================================================
-- Requires a valid referral code (or existing username) to sign up. Backed by a
-- flippable flag in app_config so you can open signups later WITHOUT a redeploy:
--   UPDATE app_config SET bool_value = false WHERE key = 'signup_requires_referral';
-- Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS app_config (
  key         TEXT PRIMARY KEY,
  bool_value  BOOLEAN,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Gate ON by default (invite-only launch).
INSERT INTO app_config (key, bool_value)
VALUES ('signup_requires_referral', true)
ON CONFLICT (key) DO NOTHING;

ALTER TABLE app_config ENABLE ROW LEVEL SECURITY;
-- No public policies — the table is read only through the SECURITY DEFINER RPC
-- below. Admins change it via the SQL editor.

-- Is the signup gate on? (defaults to true if the row is missing).
CREATE OR REPLACE FUNCTION signup_gate()
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT COALESCE((SELECT bool_value FROM app_config WHERE key = 'signup_requires_referral'), true);
$$;

-- Does this code match a real referral code OR an existing username? (mirrors how
-- record_referral resolves referrers, so both invite paths pass the gate).
CREATE OR REPLACE FUNCTION validate_referral_code(p_code TEXT)
RETURNS BOOLEAN
LANGUAGE sql SECURITY DEFINER SET search_path = public STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM users
    WHERE referral_code = upper(trim(p_code))
       OR username = lower(trim(p_code))
  );
$$;

GRANT EXECUTE ON FUNCTION signup_gate() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION validate_referral_code(TEXT) TO anon, authenticated;
