-- ============================================================
-- RASA — Migration 005: Dish Graph
-- Dish-first discovery — a core Malaysian differentiator
-- ============================================================

-- ─── Dish enum categories ────────────────────────────────────

CREATE TYPE dish_category AS ENUM (
  'rice', 'noodles', 'bread', 'grilled', 'fried',
  'soup', 'curry', 'salad', 'seafood', 'meat',
  'dim_sum', 'dessert', 'drinks', 'snacks', 'other'
);

CREATE TYPE meal_time AS ENUM (
  'breakfast', 'brunch', 'lunch', 'tea', 'dinner', 'supper', 'anytime'
);

-- ─── Dishes (canonical dish entries) ─────────────────────────

CREATE TABLE dishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  name_bm VARCHAR(200),          -- Bahasa Malaysia name
  name_zh VARCHAR(200),          -- Chinese name
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  category dish_category NOT NULL DEFAULT 'other',
  cuisine_type cuisine_type,
  best_meal_times meal_time[] DEFAULT ARRAY['anytime']::meal_time[],
  cover_photo_url TEXT,
  is_halal_by_default BOOLEAN DEFAULT false,
  is_vegetarian_by_default BOOLEAN DEFAULT false,
  wikipedia_url TEXT,
  fun_fact TEXT,
  -- Aggregated stats
  total_ratings INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  total_restaurant_count INTEGER DEFAULT 0,
  search_count INTEGER DEFAULT 0,
  is_featured BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_dishes_slug ON dishes(slug);
CREATE INDEX idx_dishes_category ON dishes(category);
CREATE INDEX idx_dishes_cuisine ON dishes(cuisine_type);
CREATE INDEX idx_dishes_featured ON dishes(is_featured, average_rating DESC) WHERE is_featured = true;
CREATE INDEX idx_dishes_search ON dishes USING gin(to_tsvector('english',
  name || ' ' || COALESCE(name_bm, '') || ' ' || COALESCE(description, '')
));

-- ─── Restaurant ↔ Dish relationship ──────────────────────────

CREATE TABLE restaurant_dishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  local_name VARCHAR(200),    -- What this restaurant calls it
  price DECIMAL(8,2),
  photo_url TEXT,
  is_signature BOOLEAN DEFAULT false,
  is_available BOOLEAN DEFAULT true,
  average_rating DECIMAL(3,2) DEFAULT 0,
  rating_count INTEGER DEFAULT 0,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, dish_id)
);

CREATE INDEX idx_restaurant_dishes_restaurant ON restaurant_dishes(restaurant_id);
CREATE INDEX idx_restaurant_dishes_dish ON restaurant_dishes(dish_id, average_rating DESC);
CREATE INDEX idx_restaurant_dishes_signature ON restaurant_dishes(dish_id) WHERE is_signature = true;

-- ─── Dish Ratings (user rates a specific dish at a restaurant) ──

CREATE TABLE dish_ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
  note TEXT,
  photo_url TEXT,
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dish_id, restaurant_id)
);

CREATE INDEX idx_dish_ratings_dish ON dish_ratings(dish_id, rating DESC);
CREATE INDEX idx_dish_ratings_user ON dish_ratings(user_id);
CREATE INDEX idx_dish_ratings_restaurant ON dish_ratings(restaurant_id, dish_id);

-- ─── Dish saves (wishlist for dishes, not restaurants) ────────

CREATE TABLE dish_saves (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dish_id UUID NOT NULL REFERENCES dishes(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, dish_id)
);

CREATE INDEX idx_dish_saves_user ON dish_saves(user_id);
CREATE INDEX idx_dish_saves_dish ON dish_saves(dish_id);

-- ─── Food Tags (community-driven restaurant tags) ─────────────

CREATE TYPE food_tag_type AS ENUM (
  'must_try', 'hidden_gem', 'worth_the_queue', 'great_value',
  'late_night', 'date_spot', 'family_friendly', 'tourist_friendly',
  'overrated', 'study_spot', 'instagrammable', 'cheap_and_good',
  'breakfast_spot', 'supper_spot', 'outdoor_seating', 'no_queue'
);

CREATE TABLE restaurant_food_tags (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  tag food_tag_type NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id, tag)
);

CREATE INDEX idx_food_tags_restaurant ON restaurant_food_tags(restaurant_id, tag);
CREATE INDEX idx_food_tags_user ON restaurant_food_tags(user_id);

-- Aggregated tag counts view (fast reads)
CREATE VIEW restaurant_tag_counts AS
SELECT
  restaurant_id,
  tag,
  COUNT(*) AS count
FROM restaurant_food_tags
GROUP BY restaurant_id, tag
ORDER BY count DESC;

-- ─── Meal Time Tags on restaurants ───────────────────────────

CREATE TABLE restaurant_meal_times (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  meal_time meal_time NOT NULL,
  opening_time TIME,
  closing_time TIME,
  is_auto_detected BOOLEAN DEFAULT false,
  UNIQUE(restaurant_id, meal_time)
);

CREATE INDEX idx_meal_times_restaurant ON restaurant_meal_times(restaurant_id);
CREATE INDEX idx_meal_times_type ON restaurant_meal_times(meal_time);

-- ─── Aggregate dish rating trigger ───────────────────────────

CREATE OR REPLACE FUNCTION update_dish_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_dish_id UUID;
  v_restaurant_id UUID;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_dish_id := OLD.dish_id;
    v_restaurant_id := OLD.restaurant_id;
  ELSE
    v_dish_id := NEW.dish_id;
    v_restaurant_id := NEW.restaurant_id;
  END IF;

  -- Update dish overall stats
  WITH stats AS (
    SELECT AVG(rating)::DECIMAL(3,2) AS avg_r, COUNT(*) AS cnt
    FROM dish_ratings
    WHERE dish_id = v_dish_id AND is_public = true
  )
  UPDATE dishes SET
    average_rating = COALESCE((SELECT avg_r FROM stats), 0),
    total_ratings = COALESCE((SELECT cnt FROM stats), 0),
    updated_at = NOW()
  WHERE id = v_dish_id;

  -- Update restaurant-dish stats
  WITH stats AS (
    SELECT AVG(rating)::DECIMAL(3,2) AS avg_r, COUNT(*) AS cnt
    FROM dish_ratings
    WHERE dish_id = v_dish_id AND restaurant_id = v_restaurant_id AND is_public = true
  )
  UPDATE restaurant_dishes SET
    average_rating = COALESCE((SELECT avg_r FROM stats), 0),
    rating_count = COALESCE((SELECT cnt FROM stats), 0)
  WHERE dish_id = v_dish_id AND restaurant_id = v_restaurant_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER dish_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON dish_ratings
  FOR EACH ROW EXECUTE FUNCTION update_dish_rating();

-- ─── Triggers updated_at ─────────────────────────────────────

CREATE TRIGGER dishes_updated_at
  BEFORE UPDATE ON dishes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_dishes ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE dish_saves ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_food_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_meal_times ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Dishes are public" ON dishes FOR SELECT USING (true);
CREATE POLICY "Admins manage dishes" ON dishes FOR ALL USING (is_admin());

CREATE POLICY "Restaurant dishes are public" ON restaurant_dishes FOR SELECT USING (true);
CREATE POLICY "Auth users add restaurant dishes" ON restaurant_dishes
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Dish ratings are public" ON dish_ratings
  FOR SELECT USING (is_public = true OR user_id = auth_user_id());
CREATE POLICY "Auth users rate dishes" ON dish_ratings
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());
CREATE POLICY "Users update own dish ratings" ON dish_ratings
  FOR UPDATE USING (user_id = auth_user_id());
CREATE POLICY "Users delete own dish ratings" ON dish_ratings
  FOR DELETE USING (user_id = auth_user_id());

CREATE POLICY "Dish saves are private" ON dish_saves
  FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY "Auth users save dishes" ON dish_saves
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());
CREATE POLICY "Users unsave dishes" ON dish_saves
  FOR DELETE USING (user_id = auth_user_id());

CREATE POLICY "Food tags are public" ON restaurant_food_tags FOR SELECT USING (true);
CREATE POLICY "Auth users add tags" ON restaurant_food_tags
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());
CREATE POLICY "Users remove own tags" ON restaurant_food_tags
  FOR DELETE USING (user_id = auth_user_id());

CREATE POLICY "Meal times are public" ON restaurant_meal_times FOR SELECT USING (true);

-- ─── Seed: Canonical Malaysian Dishes ────────────────────────

INSERT INTO dishes (name, name_bm, name_zh, slug, description, category, cuisine_type, best_meal_times, is_halal_by_default, fun_fact) VALUES
('Nasi Lemak', 'Nasi Lemak', '椰浆饭', 'nasi-lemak',
  'Malaysia''s national dish. Fragrant rice cooked in coconut milk with pandan leaf, served with sambal, anchovies, peanuts, cucumber, and a boiled or fried egg.',
  'rice', 'malay', ARRAY['breakfast', 'brunch', 'lunch']::meal_time[], true,
  'Nasi Lemak is so beloved it was featured on the cover of TIME Magazine''s "Best Foods in Asia" issue.'),

('Char Kway Teow', 'Char Kway Teow', '炒粿条', 'char-kway-teow',
  'Flat rice noodles stir-fried at high heat with prawns, cockles, Chinese sausage, eggs, bean sprouts, and dark soy sauce. Best when cooked with "wok hei" (breath of the wok).',
  'noodles', 'chinese', ARRAY['lunch', 'dinner', 'supper']::meal_time[], false,
  'The best Char Kway Teow is always cooked over charcoal fire on Penang island.'),

('Laksa', 'Laksa', '叻沙', 'laksa',
  'A spicy noodle soup with varieties across Malaysia: Penang Assam Laksa (tamarind fish soup) and Curry Laksa (coconut milk curry broth with prawns and tofu).',
  'noodles', 'nyonya', ARRAY['breakfast', 'lunch']::meal_time[], false,
  'CNN ranked Penang Assam Laksa as the 7th most delicious food in the world in 2011.'),

('Roti Canai', 'Roti Canai', '印度煎饼', 'roti-canai',
  'Flaky flatbread of Indian origin, cooked on a tawa and served with dhal curry or fish curry. A staple of every mamak restaurant.',
  'bread', 'mamak', ARRAY['breakfast', 'supper', 'anytime']::meal_time[], true,
  'The spinning technique used to stretch roti canai dough takes years to master.'),

('Nasi Goreng', 'Nasi Goreng', '炒饭', 'nasi-goreng',
  'Malaysian fried rice with a dark soy sauce base, egg, vegetables, and a choice of protein. The sambal version is particularly iconic.',
  'rice', 'malay', ARRAY['lunch', 'dinner', 'supper']::meal_time[], true, NULL),

('Mee Goreng Mamak', 'Mee Goreng Mamak', '马来炒面', 'mee-goreng-mamak',
  'Yellow noodles stir-fried with tomato sauce, egg, tofu, potato, and bean sprouts. A mamak classic with a sweet-spicy character.',
  'noodles', 'mamak', ARRAY['lunch', 'dinner', 'supper']::meal_time[], true, NULL),

('Satay', 'Satay', '沙爹', 'satay',
  'Skewered and grilled seasoned meat, served with ketupat, cucumber, onion, and peanut sauce. Kajang satay is world famous.',
  'grilled', 'malay', ARRAY['dinner', 'supper']::meal_time[], true,
  'Kajang, Selangor is known as Malaysia''s satay capital with over 40 dedicated satay restaurants.'),

('Bak Kut Teh', 'Bak Kut Teh', '肉骨茶', 'bak-kut-teh',
  'A pork rib soup simmered in a complex mix of herbs and spices. Klang is the home of the Teochew-style, while Penang serves the Hokkien pepper variety.',
  'soup', 'chinese', ARRAY['breakfast', 'lunch']::meal_time[], false,
  'Traditional Bak Kut Teh has exactly 12 herbs and spices including dong quai and wolfberries.'),

('Cendol', 'Cendol', '煎蕊', 'cendol',
  'A dessert made from pandan-flavoured green rice flour jellies, coconut milk, palm sugar syrup (gula melaka), and shaved ice.',
  'dessert', 'malay', ARRAY['tea', 'anytime']::meal_time[], true, NULL),

('Apam Balik', 'Apam Balik', '面粉糕', 'apam-balik',
  'A turnover pancake filled with sugar, creamed corn, and crushed peanuts. Available in crispy (thin) or soft (fluffy) varieties.',
  'snacks', 'malay', ARRAY['tea', 'supper']::meal_time[], true, NULL),

('Hokkien Mee', 'Hokkien Mee', '福建炒面', 'hokkien-mee',
  'Thick yellow noodles braised in a rich dark soy sauce and lard. KL Hokkien Mee differs from Penang''s prawn noodle soup.',
  'noodles', 'chinese', ARRAY['lunch', 'dinner']::meal_time[], false, NULL),

('Curry Laksa', 'Curry Laksa', '咖喱叻沙', 'curry-laksa',
  'Noodles in a rich coconut curry broth with prawns, cockles, tofu puffs, and bean sprouts. One of the most widely available breakfast dishes in KL.',
  'noodles', 'nyonya', ARRAY['breakfast', 'lunch']::meal_time[], false, NULL),

('Banana Leaf Rice', 'Nasi Daun Pisang', '香蕉叶饭', 'banana-leaf-rice',
  'South Indian rice served on a banana leaf with various curries, vegetables, and papadums. Typically eaten with bare hands.',
  'rice', 'indian', ARRAY['lunch', 'dinner']::meal_time[], true, NULL),

('Dim Sum', 'Dim Sum', '点心', 'dim-sum',
  'Cantonese-style steamed and fried dumplings, buns, and pastries. Usually served in bamboo steamers during breakfast and brunch.',
  'dim_sum', 'chinese', ARRAY['breakfast', 'brunch']::meal_time[], false,
  'Traditional dim sum is served from a pushcart — ordering from the cart is part of the experience.'),

('Teh Tarik', 'Teh Tarik', '拉茶', 'teh-tarik',
  'Malaysia''s iconic pulled milk tea. The "pulling" technique creates a frothy top while cooling the tea.',
  'drinks', 'mamak', ARRAY['breakfast', 'brunch', 'supper', 'anytime']::meal_time[], true,
  'A skilled teh tarik master can pull tea from a height of over 2 metres without spilling a drop.');
