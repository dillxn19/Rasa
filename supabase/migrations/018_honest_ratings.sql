-- ============================================================
-- MIGRATION 018: Honest ratings — clear fabricated seed numbers
-- ============================================================
-- Seed/import scripts baked fake overall_rating + total_reviews onto restaurants
-- that nobody has actually reviewed on Rasa. Zero those out so a place only
-- shows a rating once it has a REAL review. Google's own rating stays in
-- google_rating (used for ranking), just not shown as a Rasa rating.
-- Run in the Supabase SQL editor.

UPDATE restaurants r
SET overall_rating = 0,
    total_reviews = 0
WHERE NOT EXISTS (
  SELECT 1 FROM reviews rv WHERE rv.restaurant_id = r.id
);
