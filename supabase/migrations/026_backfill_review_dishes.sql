-- ============================================================
-- MIGRATION 026: backfill reviews.dishes_mentioned from the dish graph
-- ============================================================
-- Dish tags entered in the review flow were only ever written to the dish graph
-- (restaurant_dish_tags), never to reviews.dishes_mentioned — so review cards
-- (feed, activity) and the edit-prefill showed no tags. Going forward the app
-- now saves dishes_mentioned on the review; this one-off backfills existing
-- reviews so their tags show everywhere too.
-- Run manually in the Supabase SQL editor. Safe to re-run (only fills empties).

UPDATE reviews r
SET dishes_mentioned = sub.names
FROM (
  SELECT rdt.user_id, rdt.restaurant_id,
         array_agg(DISTINCT d.name) AS names
    FROM restaurant_dish_tags rdt
    JOIN dishes d ON d.id = rdt.dish_id
   GROUP BY rdt.user_id, rdt.restaurant_id
) sub
WHERE r.user_id = sub.user_id
  AND r.restaurant_id = sub.restaurant_id
  AND (r.dishes_mentioned IS NULL OR array_length(r.dishes_mentioned, 1) IS NULL);
