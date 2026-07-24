-- ============================================================
-- MIGRATION 020: Admin analytics RPCs (founder dashboard)
-- ============================================================
-- Aggregate stats across ALL users/referrals for the admin dashboard. RLS blocks
-- a normal client from counting other people's rows, so these run SECURITY
-- DEFINER and are gated by the existing is_admin() helper. Grant only to
-- authenticated; the function itself refuses non-admins.
-- Run in the Supabase SQL editor. Flag yourself admin first:
--   UPDATE users SET is_admin = true WHERE username = '<you>';

-- ─── App-wide stats (single row) ─────────────────────────────
CREATE OR REPLACE FUNCTION admin_app_stats()
RETURNS TABLE (
  total_users          bigint,
  new_users_7d         bigint,
  total_reviews        bigint,
  reviews_7d           bigint,
  total_restaurants    bigint,
  total_referrals      bigint,
  activated_referrals  bigint,
  activation_rate      numeric
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    (SELECT count(*) FROM users),
    (SELECT count(*) FROM users WHERE created_at > now() - interval '7 days'),
    (SELECT count(*) FROM reviews),
    (SELECT count(*) FROM reviews WHERE created_at > now() - interval '7 days'),
    (SELECT count(*) FROM restaurants WHERE is_active),
    (SELECT count(*) FROM referrals),
    (SELECT count(*) FROM referrals WHERE activated_at IS NOT NULL),
    CASE
      WHEN (SELECT count(*) FROM referrals) > 0
      THEN round(
        (SELECT count(*) FROM referrals WHERE activated_at IS NOT NULL)::numeric
        / (SELECT count(*) FROM referrals) * 100, 1)
      ELSE 0
    END;
END;
$$;

-- ─── Ambassador / referrer leaderboard ───────────────────────
CREATE OR REPLACE FUNCTION admin_ambassador_leaderboard()
RETURNS TABLE (
  referrer_id    uuid,
  display_name   text,
  username       text,
  avatar_url     text,
  is_ambassador  boolean,
  invited        bigint,
  activated      bigint
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'not_admin';
  END IF;

  RETURN QUERY
  SELECT
    u.id,
    u.display_name::text,
    u.username::text,
    u.avatar_url::text,
    u.is_ambassador,
    count(r.id) AS invited,
    count(r.id) FILTER (WHERE r.activated_at IS NOT NULL) AS activated
  FROM referrals r
  JOIN users u ON u.id = r.referrer_id
  GROUP BY u.id
  ORDER BY activated DESC, invited DESC
  LIMIT 100;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_app_stats() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_ambassador_leaderboard() TO authenticated;
