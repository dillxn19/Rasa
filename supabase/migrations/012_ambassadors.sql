-- ============================================================
-- MIGRATION 012: Ambassadors
-- ============================================================
-- A small group (~50 launch ambassadors) gets full access to gated features
-- (Lists, all referral/coin unlocks) so they can seed content + create
-- shareable list infographics for social marketing before public launch.
-- Flip the flag manually for chosen users:
--   UPDATE users SET is_ambassador = true WHERE username IN ('...');

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_ambassador BOOLEAN DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_users_ambassador ON users(is_ambassador) WHERE is_ambassador = true;
