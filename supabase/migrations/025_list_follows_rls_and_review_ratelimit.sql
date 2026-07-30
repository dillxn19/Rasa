-- ============================================================
-- MIGRATION 025: list_follows RLS + review submission rate-limit
-- ============================================================
-- Two pre-deploy hardening fixes:
--   1. list_follows had RLS ENABLED but ZERO policies → followList/unfollowList/
--      the is_following check in getList all silently failed (permission denied).
--   2. A light server-side rate-limit on new reviews (anti-scripted-farming),
--      complementing the existing daily coin cap + claw-back.
-- Run manually in the Supabase SQL editor (do NOT `supabase db push`).

-- ── 1. list_follows policies (mirror the `follows` table pattern) ────────────
-- Public read (follower counts are not sensitive; matches `follows`).
DROP POLICY IF EXISTS "List follows are viewable" ON list_follows;
CREATE POLICY "List follows are viewable"
  ON list_follows FOR SELECT USING (true);

-- Only the authenticated owner of the row may create it.
DROP POLICY IF EXISTS "Users can follow lists" ON list_follows;
CREATE POLICY "Users can follow lists"
  ON list_follows FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());

-- Only the owner may remove their own follow.
DROP POLICY IF EXISTS "Users can unfollow lists" ON list_follows;
CREATE POLICY "Users can unfollow lists"
  ON list_follows FOR DELETE
  USING (user_id = auth_user_id());

-- ── 2. Review submission rate-limit (server-side, not bypassable) ────────────
-- Blocks scripted spam: at most REVIEW_LIMIT genuinely-new reviews per user per
-- rolling window. Same-restaurant edits use ON CONFLICT DO UPDATE and do NOT
-- fire this BEFORE INSERT trigger, so normal editing is unaffected.
CREATE OR REPLACE FUNCTION enforce_review_rate_limit()
RETURNS TRIGGER AS $$
DECLARE
  recent_count INT;
  window_secs  CONSTANT INT := 60;   -- rolling window
  max_new      CONSTANT INT := 6;    -- generous for a human, kills scripts
BEGIN
  SELECT count(*) INTO recent_count
    FROM reviews
   WHERE user_id = NEW.user_id
     AND created_at > (now() - make_interval(secs => window_secs));

  IF recent_count >= max_new THEN
    RAISE EXCEPTION 'Slow down — too many reviews in a short time. Try again in a moment.'
      USING ERRCODE = 'check_violation';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_review_rate_limit ON reviews;
CREATE TRIGGER trg_review_rate_limit
  BEFORE INSERT ON reviews
  FOR EACH ROW EXECUTE FUNCTION enforce_review_rate_limit();
