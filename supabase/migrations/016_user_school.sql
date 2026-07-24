-- ============================================================
-- MIGRATION 016: Optional school / university on profile
-- ============================================================
-- Purely optional, self-declared (no verification). Lets students show their
-- campus and powers future campus-flavoured discovery/marketing without
-- limiting who can use the app. Run manually in the Supabase SQL editor.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS school VARCHAR(120);
