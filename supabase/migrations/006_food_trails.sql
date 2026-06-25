-- ============================================================
-- RASA — Migration 006: Food Trails
-- Curated food routes — tourism and exploration layer
-- ============================================================

CREATE TYPE trail_difficulty AS ENUM ('easy', 'moderate', 'hardcore');
CREATE TYPE trail_type AS ENUM ('curated', 'user_created', 'community');

-- ─── Food Trails ─────────────────────────────────────────────

CREATE TABLE food_trails (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  title VARCHAR(200) NOT NULL,
  title_bm VARCHAR(200),
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT NOT NULL,
  cover_photo_url TEXT,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100),
  difficulty trail_difficulty DEFAULT 'easy',
  trail_type trail_type DEFAULT 'curated',
  estimated_duration_hours DECIMAL(4,1),
  estimated_cost_myr DECIMAL(8,2),
  best_time VARCHAR(100),        -- e.g. "Weekend mornings", "Friday evenings"
  best_meal_times meal_time[],
  cuisines cuisine_type[],
  tags TEXT[],
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  total_stops INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_trails_city ON food_trails(city, is_published) WHERE is_published = true;
CREATE INDEX idx_trails_featured ON food_trails(is_featured) WHERE is_featured = true;
CREATE INDEX idx_trails_type ON food_trails(trail_type, is_published);
CREATE INDEX idx_trails_slug ON food_trails(slug);

-- ─── Trail Stops (ordered restaurants in a trail) ─────────────

CREATE TABLE food_trail_stops (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  trail_id UUID NOT NULL REFERENCES food_trails(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  recommended_dish_id UUID REFERENCES dishes(id),
  tip TEXT,                      -- e.g. "Order the dry version", "Arrive before 8am"
  estimated_spend_myr DECIMAL(8,2),
  is_optional BOOLEAN DEFAULT false,
  UNIQUE(trail_id, position),
  UNIQUE(trail_id, restaurant_id)
);

CREATE INDEX idx_trail_stops_trail ON food_trail_stops(trail_id, position);
CREATE INDEX idx_trail_stops_restaurant ON food_trail_stops(restaurant_id);

-- ─── User Trail Progress ──────────────────────────────────────

CREATE TABLE user_trail_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES food_trails(id) ON DELETE CASCADE,
  completed_stops UUID[] DEFAULT '{}',   -- array of stop restaurant_ids
  is_completed BOOLEAN DEFAULT false,
  completed_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trail_id)
);

CREATE INDEX idx_trail_progress_user ON user_trail_progress(user_id);
CREATE INDEX idx_trail_progress_trail ON user_trail_progress(trail_id);

-- ─── Trail Follows ────────────────────────────────────────────

CREATE TABLE trail_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  trail_id UUID NOT NULL REFERENCES food_trails(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, trail_id)
);

CREATE INDEX idx_trail_follows_user ON trail_follows(user_id);
CREATE INDEX idx_trail_follows_trail ON trail_follows(trail_id);

-- ─── Trail follower + completion count triggers ───────────────

CREATE OR REPLACE FUNCTION handle_trail_follow()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE food_trails SET follower_count = follower_count + 1 WHERE id = NEW.trail_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE food_trails SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.trail_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trail_follow_count
  AFTER INSERT OR DELETE ON trail_follows
  FOR EACH ROW EXECUTE FUNCTION handle_trail_follow();

CREATE OR REPLACE FUNCTION handle_trail_completion()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_completed AND NOT OLD.is_completed THEN
    UPDATE food_trails SET completion_count = completion_count + 1 WHERE id = NEW.trail_id;
    NEW.completed_at = NOW();

    -- Award activity event
    INSERT INTO activity_events (user_id, type, data, is_public)
    VALUES (
      NEW.user_id,
      'milestone',
      jsonb_build_object(
        'trail_id', NEW.trail_id,
        'event', 'trail_completed'
      ),
      true
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trail_completion_handler
  BEFORE UPDATE ON user_trail_progress
  FOR EACH ROW EXECUTE FUNCTION handle_trail_completion();

-- trail stop count trigger
CREATE OR REPLACE FUNCTION update_trail_stop_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE food_trails SET total_stops = total_stops + 1 WHERE id = NEW.trail_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE food_trails SET total_stops = GREATEST(0, total_stops - 1) WHERE id = OLD.trail_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trail_stop_count
  AFTER INSERT OR DELETE ON food_trail_stops
  FOR EACH ROW EXECUTE FUNCTION update_trail_stop_count();

-- ─── Updated_at trigger ───────────────────────────────────────

CREATE TRIGGER food_trails_updated_at
  BEFORE UPDATE ON food_trails
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ─── RLS ─────────────────────────────────────────────────────

ALTER TABLE food_trails ENABLE ROW LEVEL SECURITY;
ALTER TABLE food_trail_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_trail_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE trail_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published trails are public" ON food_trails
  FOR SELECT USING (is_published = true OR created_by = auth_user_id());

CREATE POLICY "Auth users create trails" ON food_trails
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND created_by = auth_user_id());

CREATE POLICY "Trail creators can edit" ON food_trails
  FOR UPDATE USING (created_by = auth_user_id() OR is_admin());

CREATE POLICY "Trail stops follow trail visibility" ON food_trail_stops
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM food_trails WHERE id = trail_id AND (is_published = true OR created_by = auth_user_id()))
  );

CREATE POLICY "Users see own trail progress" ON user_trail_progress
  FOR SELECT USING (user_id = auth_user_id());
CREATE POLICY "Users create own trail progress" ON user_trail_progress
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());
CREATE POLICY "Users update own trail progress" ON user_trail_progress
  FOR UPDATE USING (user_id = auth_user_id());

CREATE POLICY "Trail follows are public" ON trail_follows FOR SELECT USING (true);
CREATE POLICY "Auth users follow trails" ON trail_follows
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth_user_id());
CREATE POLICY "Users unfollow trails" ON trail_follows
  FOR DELETE USING (user_id = auth_user_id());

-- ─── Seed: Featured Food Trails ──────────────────────────────

INSERT INTO food_trails (
  title, slug, description, city, state, difficulty,
  estimated_duration_hours, estimated_cost_myr, best_time,
  best_meal_times, cuisines, tags, is_published, is_featured, trail_type
) VALUES
(
  'KL Nasi Lemak Trail',
  'kl-nasi-lemak-trail',
  'Discover the most iconic nasi lemak spots in Kuala Lumpur, from the legendary Village Park in Damansara to the midnight nasi lemak stalls of Jalan Ipoh. This trail covers different styles: coconut rice purists, sambal kings, and the ultimate fried chicken masters.',
  'Kuala Lumpur', 'Wilayah Persekutuan', 'easy',
  4.0, 60.00, 'Saturday or Sunday morning',
  ARRAY['breakfast', 'brunch']::meal_time[],
  ARRAY['malay']::cuisine_type[],
  ARRAY['nasi lemak', 'breakfast', 'weekend', 'classic'],
  true, true, 'curated'
),
(
  'Penang Weekend Food Trail',
  'penang-weekend-food-trail',
  'The ultimate 48-hour Penang food pilgrimage. Hit the legendary hawker stalls of Lorong Baru, the Asam Laksa queens of Air Itam, and the best char kway teow on the island. George Town''s UNESCO heritage streets are your backdrop.',
  'Penang', 'Pulau Pinang', 'moderate',
  8.0, 150.00, 'Saturday and Sunday',
  ARRAY['breakfast', 'lunch', 'dinner', 'supper']::meal_time[],
  ARRAY['chinese', 'malay', 'nyonya']::cuisine_type[],
  ARRAY['penang', 'hawker', 'heritage', 'weekend trip', 'food travel'],
  true, true, 'curated'
),
(
  'PJ Cafe Crawl',
  'pj-cafe-crawl',
  'Petaling Jaya has quietly become one of Southeast Asia''s best cafe scenes. This trail takes you through Damansara Uptown, SS2, and Section 17 — from specialty coffee pioneers to Insta-worthy brunch spots. Best done on a weekday to avoid queues.',
  'Petaling Jaya', 'Selangor', 'easy',
  5.0, 120.00, 'Weekday mornings',
  ARRAY['brunch', 'tea']::meal_time[],
  ARRAY['cafe', 'western']::cuisine_type[],
  ARRAY['cafe', 'specialty coffee', 'brunch', 'instagram', 'PJ'],
  true, true, 'curated'
),
(
  'KL Mamak Late Night Tour',
  'kl-mamak-late-night-tour',
  'The ultimate KL supper run. Malaysia''s mamak restaurants never sleep, and this trail hits the best ones from Bangsar to Chow Kit. Roti canai, mee goreng, teh tarik, and maggi goreng at 2am — this is what KL nights are made of.',
  'Kuala Lumpur', 'Wilayah Persekutuan', 'easy',
  3.0, 50.00, 'Friday or Saturday nights after 11pm',
  ARRAY['supper']::meal_time[],
  ARRAY['mamak', 'indian']::cuisine_type[],
  ARRAY['mamak', 'supper', 'late night', 'budget', 'KL'],
  true, false, 'curated'
),
(
  'JB Hidden Gems Tour',
  'jb-hidden-gems-tour',
  'Johor Bahru''s food scene is massively underrated. This trail uncovers the city''s best kept secrets — from the legendary Jalan Tan Hiok Nee wonton mee to the floating seafood restaurants of Danga Bay.',
  'Johor Bahru', 'Johor', 'moderate',
  6.0, 100.00, 'Weekend',
  ARRAY['breakfast', 'lunch', 'dinner']::meal_time[],
  ARRAY['chinese', 'malay', 'seafood']::cuisine_type[],
  ARRAY['JB', 'hidden gems', 'seafood', 'wonton mee'],
  true, false, 'curated'
);
