-- ============================================================
-- MIGRATION 008: Referrals + Feature Unlocks (dual-track unlocks)
-- ============================================================
-- Features can be unlocked by EITHER hitting a referral milestone OR spending
-- Rasa Coins (see docs/referrals_and_unlocks.md).

-- ── Referrals ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS referrals (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  referrer_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  referred_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  activated_at TIMESTAMPTZ,           -- set when the referred user posts first review
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (referred_id)                -- a user can only be referred once
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_id);

ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view referrals they made" ON referrals;
CREATE POLICY "Users can view referrals they made"
  ON referrals FOR SELECT USING (referrer_id = auth_user_id() OR referred_id = auth_user_id());

-- ── Feature unlocks ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS feature_unlocks (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  feature    VARCHAR(60) NOT NULL,
  source     VARCHAR(20) NOT NULL,   -- 'coins' | 'referral'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, feature)
);

CREATE INDEX IF NOT EXISTS idx_feature_unlocks_user ON feature_unlocks(user_id);

ALTER TABLE feature_unlocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own feature unlocks" ON feature_unlocks;
CREATE POLICY "Users can view own feature unlocks"
  ON feature_unlocks FOR SELECT USING (user_id = auth_user_id());
DROP POLICY IF EXISTS "Users can insert own feature unlocks" ON feature_unlocks;
CREATE POLICY "Users can insert own feature unlocks"
  ON feature_unlocks FOR INSERT WITH CHECK (user_id = auth_user_id());

-- ── Referral RPCs (SECURITY DEFINER) ─────────────────────────
-- Inserts/activation go through these functions so the client never writes to
-- referrals directly (RLS on referrals is SELECT-only). Both are idempotent and
-- carry the anti-abuse rules (no self-referral, one referral per referred user,
-- activation credited once).

-- Called after a referred user finishes onboarding. Resolves the referrer by
-- username, records the referral, and pays the referrer the signup bonus once.
CREATE OR REPLACE FUNCTION record_referral(p_referrer_username TEXT, p_referred_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
  v_inserted    INT;
BEGIN
  SELECT id INTO v_referrer_id
    FROM users WHERE username = lower(p_referrer_username) LIMIT 1;

  -- Unknown referrer or self-referral → no-op.
  IF v_referrer_id IS NULL OR v_referrer_id = p_referred_id THEN
    RETURN;
  END IF;

  INSERT INTO referrals (referrer_id, referred_id)
  VALUES (v_referrer_id, p_referred_id)
  ON CONFLICT (referred_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  IF v_inserted > 0 THEN
    PERFORM award_coins(v_referrer_id, 200, 'referral_signup', 'Referred a new foodie');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Called on the referred user's first review. Flips activated_at once and pays
-- the referrer the activation bonus. Safe to call on every review (no-ops once
-- activated / when there is no referral row).
CREATE OR REPLACE FUNCTION activate_referral(p_referred_id UUID)
RETURNS VOID AS $$
DECLARE
  v_referrer_id UUID;
BEGIN
  UPDATE referrals
    SET activated_at = NOW()
  WHERE referred_id = p_referred_id AND activated_at IS NULL
  RETURNING referrer_id INTO v_referrer_id;

  IF v_referrer_id IS NOT NULL THEN
    PERFORM award_coins(v_referrer_id, 200, 'referral_activated', 'A referral posted their first review');
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_referral(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_referral(UUID) TO authenticated;
