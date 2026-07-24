-- ============================================================
-- MIGRATION 009: Referral coin notifications
-- ============================================================
-- The referral RPCs already pay the referrer coins silently. This migration
-- re-defines them (CREATE OR REPLACE, same signatures/behaviour) so they ALSO
-- drop a notification into the referrer's activity feed when coins land.
--
-- Notifications are inserted from SECURITY DEFINER functions, so they bypass the
-- notifications RLS (there is no client INSERT policy — only the server writes).
-- We reuse the existing 'milestone' notification_type to avoid an in-transaction
-- ALTER TYPE ADD VALUE. actor_id = the referred user so tapping the notification
-- opens their profile.

-- ── record_referral: pays + notifies the referrer on signup ──────────────────
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

-- ── activate_referral: pays + notifies the referrer on first review ───────────
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

    INSERT INTO notifications (user_id, actor_id, type, title, body, data)
    VALUES (
      v_referrer_id,
      p_referred_id,
      'milestone',
      'You earned 200 more Rasa Coins! 🎉',
      'A friend you invited just posted their first review.',
      jsonb_build_object('kind', 'referral_activated', 'coins', 200)
    );
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION record_referral(TEXT, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION activate_referral(UUID) TO authenticated;
