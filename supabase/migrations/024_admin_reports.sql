-- ============================================================
-- MIGRATION 024: Admin moderation — read + resolve reports
-- ============================================================
-- Surfaces the `reports` queue in the web admin dashboard, gated by is_admin().
-- Run in the Supabase SQL editor.

-- Pending (and recently-resolved) reports with reporter + reported names.
CREATE OR REPLACE FUNCTION admin_reports()
RETURNS TABLE (
  id                 uuid,
  reason             text,
  description        text,
  status             text,
  created_at         timestamptz,
  reporter_name      text,
  reporter_username  text,
  reported_name      text,
  reported_username  text,
  review_id          uuid,
  comment_id         uuid,
  restaurant_id      uuid
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not_admin'; END IF;

  RETURN QUERY
  SELECT
    r.id, r.reason::text, r.description, r.status::text, r.created_at,
    rep.display_name::text, rep.username::text,
    tgt.display_name::text, tgt.username::text,
    r.review_id, r.comment_id, r.restaurant_id
  FROM reports r
  LEFT JOIN users rep ON rep.id = r.reporter_id
  LEFT JOIN users tgt ON tgt.id = r.user_id
  ORDER BY (r.status = 'pending') DESC, r.created_at DESC
  LIMIT 300;
END;
$$;

-- Mark a report resolved (or dismissed) — records who/when.
CREATE OR REPLACE FUNCTION admin_resolve_report(p_id uuid, p_status text DEFAULT 'resolved')
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT is_admin() THEN RAISE EXCEPTION 'not_admin'; END IF;
  UPDATE reports
     SET status = p_status, resolved_by = auth_user_id(), resolved_at = now()
   WHERE id = p_id;
END;
$$;

GRANT EXECUTE ON FUNCTION admin_reports() TO authenticated;
GRANT EXECUTE ON FUNCTION admin_resolve_report(uuid, text) TO authenticated;
