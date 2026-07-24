-- ============================================================
-- MIGRATION 013: Moderation (blocks) + report targets
-- ============================================================
-- App Store readiness for user-generated content (Apple guideline 1.2):
--   * users can BLOCK abusive users (bidirectional hide)
--   * users can REPORT reviews / users / comments (reports table already
--     exists from 001 — here we just add a comment_id target)
-- Run manually in the Supabase SQL editor (do NOT `supabase db push`).

-- ── Blocks ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS blocks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (blocker_id, blocked_id),
  CHECK (blocker_id <> blocked_id)
);

CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_blocks_blocked ON blocks(blocked_id);

ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- A user can see, create and delete only their OWN block rows.
DROP POLICY IF EXISTS "Users can view their own blocks" ON blocks;
CREATE POLICY "Users can view their own blocks"
  ON blocks FOR SELECT USING (blocker_id = auth_user_id());

DROP POLICY IF EXISTS "Users can create their own blocks" ON blocks;
CREATE POLICY "Users can create their own blocks"
  ON blocks FOR INSERT WITH CHECK (blocker_id = auth_user_id());

DROP POLICY IF EXISTS "Users can delete their own blocks" ON blocks;
CREATE POLICY "Users can delete their own blocks"
  ON blocks FOR DELETE USING (blocker_id = auth_user_id());

-- Blocking a user also breaks any follow relationship in both directions,
-- so blocked users stop appearing in each other's followers/feeds.
CREATE OR REPLACE FUNCTION handle_new_block()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM follows
   WHERE (follower_id = NEW.blocker_id AND following_id = NEW.blocked_id)
      OR (follower_id = NEW.blocked_id AND following_id = NEW.blocker_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_new_block ON blocks;
CREATE TRIGGER trg_new_block
  AFTER INSERT ON blocks
  FOR EACH ROW EXECUTE FUNCTION handle_new_block();

-- ── Reports: allow reporting a comment too ────────────────
ALTER TABLE reports
  ADD COLUMN IF NOT EXISTS comment_id UUID REFERENCES comments(id) ON DELETE CASCADE;
