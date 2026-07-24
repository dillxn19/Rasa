-- ============================================================
-- MIGRATION 015: Relative ranking (Beli-style within-tier ordering)
-- ============================================================
-- Stars stay the coarse tier; `rank_score` is a fine-grained personal score
-- (0–10) that orders a user's places WITHIN a star tier via quick pairwise
-- comparisons. 5★ lives in the 8–10 band, 4★ in 6–8, … 1★ in 0–2, so the
-- overall order is always: all 5★ above all 4★, refined inside each band.
-- Run manually in the Supabase SQL editor.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS rank_score DECIMAL(4, 2);

-- Backfill: seed each review at the top of its star band (ties broken later
-- as the user compares). 5→10, 4→8, 3→6, 2→4, 1→2.
UPDATE reviews SET rank_score = rating * 2.0 WHERE rank_score IS NULL;

-- Re-space a user's reviews in one tier given their new top→bottom order.
-- Interpolates across the star's band so scores never cross tier boundaries.
CREATE OR REPLACE FUNCTION reorder_reviews(
  p_user_id UUID,
  p_rating INT,
  p_ordered_ids UUID[]
) RETURNS VOID AS $$
DECLARE
  band_bottom NUMERIC := (p_rating - 1) * 2.0;
  band_top    NUMERIC := p_rating * 2.0;
  n INT := array_length(p_ordered_ids, 1);
  i INT;
  score NUMERIC;
BEGIN
  IF n IS NULL THEN RETURN; END IF;
  FOR i IN 1..n LOOP
    IF n = 1 THEN
      score := band_top; -- lone item sits at the top of its band
    ELSE
      -- position 1 (best) → band_top, last → just above band_bottom
      score := band_top - ((i - 1)::NUMERIC / n) * (band_top - band_bottom);
    END IF;
    UPDATE reviews
       SET rank_score = ROUND(score, 2)
     WHERE id = p_ordered_ids[i] AND user_id = p_user_id;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION reorder_reviews(UUID, INT, UUID[]) TO authenticated;
