-- ============================================================
-- MIGRATION 017: School change cooldown (for fair campus leaderboards)
-- ============================================================
-- Tracks when a user last changed their school and blocks changes within 7 days
-- (server-side, so it can't be gamed by hopping campuses to top sub-boards).
-- Run manually in the Supabase SQL editor. (Depends on 016's users.school.)

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS school_updated_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION enforce_school_change_cooldown()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.school IS DISTINCT FROM OLD.school THEN
    IF OLD.school_updated_at IS NOT NULL
       AND OLD.school_updated_at > now() - interval '7 days' THEN
      RAISE EXCEPTION 'school_change_cooldown';
    END IF;
    NEW.school_updated_at := now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_school_cooldown ON users;
CREATE TRIGGER trg_school_cooldown
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION enforce_school_change_cooldown();

-- Index to make campus leaderboards fast.
CREATE INDEX IF NOT EXISTS idx_users_school ON users(school) WHERE school IS NOT NULL;
