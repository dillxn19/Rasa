-- ============================================================
-- MIGRATION 014: Referral codes
-- ============================================================
-- Adds a short, typeable, unambiguous referral code per user (e.g. MK7Q27).
-- Codes are the reliable invite path: a link's ?ref= param does NOT survive a
-- fresh App Store install, but a code a friend types at signup does.
-- record_referral now resolves the referrer by CODE or username (so links that
-- were already shared with ?ref=<username> keep working).
-- Run manually in the Supabase SQL editor (do NOT `supabase db push`).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS referral_code VARCHAR(10) UNIQUE;

-- Unambiguous alphabet: no 0/O, 1/I/L to avoid transcription errors.
CREATE OR REPLACE FUNCTION generate_referral_code()
RETURNS TEXT AS $$
DECLARE
  alphabet TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  code TEXT;
  i INT;
BEGIN
  LOOP
    code := '';
    FOR i IN 1..6 LOOP
      code := code || substr(alphabet, floor(random() * length(alphabet))::int + 1, 1);
    END LOOP;
    EXIT WHEN NOT EXISTS (SELECT 1 FROM users WHERE referral_code = code);
  END LOOP;
  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Backfill everyone who doesn't have one yet.
UPDATE users SET referral_code = generate_referral_code() WHERE referral_code IS NULL;

-- Auto-assign to every new signup.
CREATE OR REPLACE FUNCTION set_referral_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.referral_code IS NULL THEN
    NEW.referral_code := generate_referral_code();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_referral_code ON users;
CREATE TRIGGER trg_set_referral_code
  BEFORE INSERT ON users
  FOR EACH ROW EXECUTE FUNCTION set_referral_code();

-- ── record_referral now resolves by CODE or username ────────────────────────
-- Same signature (param still named p_referrer_username) so the client is
-- unchanged; it just accepts a code too. Keeps the signup coins + notification.
CREATE OR REPLACE FUNCTION record_referral(p_referrer_username TEXT, p_referred_id UUID)
RETURNS VOID AS $$
DECLARE
  v_ref         TEXT := trim(p_referrer_username);
  v_referrer_id UUID;
  v_inserted    INT;
BEGIN
  IF v_ref IS NULL OR v_ref = '' THEN
    RETURN;
  END IF;

  SELECT id INTO v_referrer_id
    FROM users
   WHERE referral_code = upper(v_ref)
      OR username = lower(v_ref)
   LIMIT 1;

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

    INSERT INTO notifications (user_id, actor_id, type, title, body, data)
    VALUES (
      v_referrer_id,
      p_referred_id,
      'milestone',
      'You earned 200 Rasa Coins! 🪙',
      'A friend joined Rasa using your invite.',
      jsonb_build_object('kind', 'referral_signup', 'coins', 200)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_referral(TEXT, UUID) TO authenticated;
