-- ============================================================
-- MIGRATION 010: Community dish tags
-- ============================================================
-- Crowd-sourced dish -> restaurant links. When users tag "I ate Nasi Lemak here"
-- during a review, it strengthens the dish graph (restaurant_dishes) so the
-- restaurant ranks in that dish's search — the proper fix for the Algolia
-- fallback hack. Tags are deduped per user/restaurant/dish and a dish only
-- surfaces publicly for a restaurant once >= 2 distinct users tag it (or it has
-- real dish ratings). All tagging goes through the SECURITY DEFINER tag_dish()
-- RPC so the client never writes the graph directly.

-- ── Per-user dish tags (dedupe / distinct-user counting) ─────────────────────
CREATE TABLE IF NOT EXISTS restaurant_dish_tags (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish_id       UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, restaurant_id, dish_id)   -- one tag per user/dish/restaurant
);

CREATE INDEX IF NOT EXISTS idx_dish_tags_restaurant ON restaurant_dish_tags(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_dish_tags_dish ON restaurant_dish_tags(dish_id);

ALTER TABLE restaurant_dish_tags ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Dish tags are public" ON restaurant_dish_tags;
CREATE POLICY "Dish tags are public" ON restaurant_dish_tags FOR SELECT USING (true);
DROP POLICY IF EXISTS "Users remove own dish tags" ON restaurant_dish_tags;
CREATE POLICY "Users remove own dish tags" ON restaurant_dish_tags
  FOR DELETE USING (user_id = auth_user_id());
-- No client INSERT policy on purpose: inserts happen through tag_dish() only.

-- ── Ranking signal columns on the dish graph ─────────────────────────────────
-- tag_count == number of distinct users who tagged the dish here (each tag row
-- is unique per user). signal_score blends real ratings with community tags so
-- the dish view can order by a single column.
ALTER TABLE restaurant_dishes
  ADD COLUMN IF NOT EXISTS tag_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE restaurant_dishes
  ADD COLUMN IF NOT EXISTS signal_score INTEGER
  GENERATED ALWAYS AS (rating_count + tag_count) STORED;

CREATE INDEX IF NOT EXISTS idx_restaurant_dishes_signal
  ON restaurant_dishes(dish_id, signal_score DESC);

-- ── tag_dish RPC ─────────────────────────────────────────────────────────────
-- Resolves (or creates) the canonical dish, ensures the restaurant<->dish link,
-- records the user's tag (deduped), and bumps tag_count on a genuinely new tag.
-- Pass either p_dish_id (existing canonical dish) or p_dish_name (free text —
-- creates the dish if it doesn't exist yet). Returns the dish id.
CREATE OR REPLACE FUNCTION tag_dish(
  p_user_id       UUID,
  p_restaurant_id UUID,
  p_dish_id       UUID,
  p_dish_name     TEXT
) RETURNS UUID AS $$
DECLARE
  v_dish_id  UUID;
  v_slug     TEXT;
  v_inserted INT;
BEGIN
  -- 1. Resolve the dish.
  IF p_dish_id IS NOT NULL THEN
    v_dish_id := p_dish_id;
  ELSE
    IF p_dish_name IS NULL OR btrim(p_dish_name) = '' THEN
      RETURN NULL;
    END IF;

    -- Reuse an existing dish with the same name (case-insensitive) before creating.
    SELECT id INTO v_dish_id
      FROM dishes WHERE lower(name) = lower(btrim(p_dish_name)) LIMIT 1;

    IF v_dish_id IS NULL THEN
      v_slug := btrim(regexp_replace(lower(btrim(p_dish_name)), '[^a-z0-9]+', '-', 'g'), '-');
      IF v_slug = '' THEN v_slug := 'dish'; END IF;
      IF EXISTS (SELECT 1 FROM dishes WHERE slug = v_slug) THEN
        v_slug := v_slug || '-' || substr(md5(random()::text), 1, 6);
      END IF;

      INSERT INTO dishes (name, slug, category)
      VALUES (btrim(p_dish_name), v_slug, 'other')
      RETURNING id INTO v_dish_id;
    END IF;
  END IF;

  IF v_dish_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Ensure the restaurant<->dish link exists.
  INSERT INTO restaurant_dishes (restaurant_id, dish_id, added_by)
  VALUES (p_restaurant_id, v_dish_id, p_user_id)
  ON CONFLICT (restaurant_id, dish_id) DO NOTHING;

  -- 3. Record this user's tag (deduped) and bump the count only when it's new.
  INSERT INTO restaurant_dish_tags (user_id, restaurant_id, dish_id)
  VALUES (p_user_id, p_restaurant_id, v_dish_id)
  ON CONFLICT (user_id, restaurant_id, dish_id) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF v_inserted > 0 THEN
    UPDATE restaurant_dishes
      SET tag_count = tag_count + 1
    WHERE restaurant_id = p_restaurant_id AND dish_id = v_dish_id;

    -- Keep the dish's restaurant-count roughly in sync (restaurants where the
    -- dish has any signal — a rating or a tag).
    UPDATE dishes SET total_restaurant_count = (
      SELECT COUNT(*) FROM restaurant_dishes
      WHERE dish_id = v_dish_id AND (tag_count > 0 OR rating_count > 0)
    ) WHERE id = v_dish_id;
  END IF;

  RETURN v_dish_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION tag_dish(UUID, UUID, UUID, TEXT) TO authenticated;
