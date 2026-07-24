-- ============================================================
-- MIGRATION 021: Waitlist + job application capture (admin-visible)
-- ============================================================
-- Stores marketing-site signups so they show in the web admin dashboard (not
-- just email). Edge functions insert via the service role (bypasses RLS);
-- only admins can read. Run in the Supabase SQL editor.

CREATE TABLE IF NOT EXISTS waitlist (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,   -- store lowercased from the function
  phone       TEXT,
  referral    TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS job_applications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  role        TEXT NOT NULL,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  instagram   TEXT,
  tiktok      TEXT,
  university  TEXT,
  portfolio   TEXT,
  message     TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_created ON waitlist (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_apps_created ON job_applications (created_at DESC);

ALTER TABLE waitlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;

-- Reads are admin-only. Inserts come from the edge functions using the service
-- role, which bypasses RLS entirely — so no public insert policy is needed.
DROP POLICY IF EXISTS "admins read waitlist" ON waitlist;
CREATE POLICY "admins read waitlist" ON waitlist FOR SELECT USING (is_admin());

DROP POLICY IF EXISTS "admins read applications" ON job_applications;
CREATE POLICY "admins read applications" ON job_applications FOR SELECT USING (is_admin());
