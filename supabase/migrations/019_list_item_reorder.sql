-- ============================================================
-- MIGRATION 019: Allow list owners to reorder their list items
-- ============================================================
-- list_items had SELECT/INSERT/DELETE policies but no UPDATE, so reordering
-- (setting `position`) was blocked by RLS. Add an owner UPDATE policy.
-- Run in the Supabase SQL editor.

DROP POLICY IF EXISTS "List owners can update list items" ON list_items;
CREATE POLICY "List owners can update list items"
  ON list_items FOR UPDATE USING (
    EXISTS (SELECT 1 FROM lists WHERE id = list_id AND user_id = auth_user_id())
    OR added_by = auth_user_id()
  );
