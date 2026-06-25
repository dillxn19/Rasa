-- ============================================================
-- RASA — Migration 002: Functions, Triggers, and Stored Procedures
-- ============================================================

-- ============================================================
-- AUTO-CREATE USER PROFILE ON SIGNUP
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (auth_id, username, display_name, email)
  VALUES (
    NEW.id,
    LOWER(SPLIT_PART(NEW.email, '@', 1)) || '_' || SUBSTR(NEW.id::TEXT, 1, 4),
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email
  );

  INSERT INTO public.food_passports (user_id)
  SELECT id FROM public.users WHERE auth_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- RATING AGGREGATION TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION update_restaurant_rating()
RETURNS TRIGGER AS $$
DECLARE
  v_restaurant_id UUID;
  v_avg_rating DECIMAL(3,2);
  v_total INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_restaurant_id := OLD.restaurant_id;
  ELSE
    v_restaurant_id := NEW.restaurant_id;
  END IF;

  SELECT
    ROUND(AVG(rating)::NUMERIC, 2),
    COUNT(*)
  INTO v_avg_rating, v_total
  FROM reviews
  WHERE restaurant_id = v_restaurant_id AND is_public = true;

  UPDATE restaurants SET
    overall_rating = COALESCE(v_avg_rating, 0),
    total_ratings = COALESCE(v_total, 0),
    total_reviews = COALESCE(v_total, 0),
    updated_at = NOW()
  WHERE id = v_restaurant_id;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER review_rating_update
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_restaurant_rating();

-- ============================================================
-- REVIEW COUNT TRIGGER ON USERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_user_review_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET
      total_reviews = total_reviews + 1,
      updated_at = NOW()
    WHERE id = NEW.user_id;

    -- Update food passport
    UPDATE food_passports SET
      reviews_written = reviews_written + 1,
      updated_at = NOW()
    WHERE user_id = NEW.user_id;

    -- Add to activity feed
    INSERT INTO activity_events (user_id, type, restaurant_id, review_id, is_public)
    VALUES (NEW.user_id, 'review', NEW.restaurant_id, NEW.id, NEW.is_public);

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET
      total_reviews = GREATEST(0, total_reviews - 1),
      updated_at = NOW()
    WHERE id = OLD.user_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER review_user_count
  AFTER INSERT OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_user_review_count();

-- ============================================================
-- VISIT TRACKING TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_new_visit()
RETURNS TRIGGER AS $$
DECLARE
  v_restaurant_city TEXT;
  v_restaurant_state TEXT;
  v_restaurant_cuisines cuisine_type[];
  v_restaurant_category restaurant_category;
BEGIN
  SELECT city, state, cuisines, category
  INTO v_restaurant_city, v_restaurant_state, v_restaurant_cuisines, v_restaurant_category
  FROM restaurants WHERE id = NEW.restaurant_id;

  -- Update user total visits
  UPDATE users SET
    total_visits = total_visits + 1,
    updated_at = NOW()
  WHERE id = NEW.user_id;

  -- Update restaurant total visits
  UPDATE restaurants SET
    total_visits = total_visits + 1,
    popularity_score = popularity_score + 1,
    updated_at = NOW()
  WHERE id = NEW.restaurant_id;

  -- Update food passport
  UPDATE food_passports SET
    restaurants_visited = restaurants_visited + 1,
    cities_visited = ARRAY(SELECT DISTINCT unnest(cities_visited || ARRAY[v_restaurant_city])),
    states_visited = CASE
      WHEN v_restaurant_state IS NOT NULL
      THEN ARRAY(SELECT DISTINCT unnest(states_visited || ARRAY[v_restaurant_state]))
      ELSE states_visited
    END,
    cuisines_tried = ARRAY(SELECT DISTINCT unnest(cuisines_tried || v_restaurant_cuisines)),
    categories_tried = ARRAY(SELECT DISTINCT unnest(categories_tried || ARRAY[v_restaurant_category])),
    last_activity_date = NOW()::DATE,
    updated_at = NOW()
  WHERE user_id = NEW.user_id;

  -- Add to activity feed
  INSERT INTO activity_events (user_id, type, restaurant_id, is_public)
  VALUES (NEW.user_id, 'visit', NEW.restaurant_id, true)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_new_visit
  AFTER INSERT ON visits
  FOR EACH ROW EXECUTE FUNCTION handle_new_visit();

-- ============================================================
-- FOLLOW COUNTER TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_follow()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE users SET follower_count = follower_count + 1 WHERE id = NEW.following_id;
    UPDATE users SET following_count = following_count + 1 WHERE id = NEW.follower_id;

    -- Create notification
    INSERT INTO notifications (user_id, actor_id, type, title, body, data)
    VALUES (
      NEW.following_id,
      NEW.follower_id,
      'follow',
      'New follower',
      (SELECT display_name FROM users WHERE id = NEW.follower_id) || ' started following you',
      jsonb_build_object('follower_id', NEW.follower_id)
    );

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE users SET follower_count = GREATEST(0, follower_count - 1) WHERE id = OLD.following_id;
    UPDATE users SET following_count = GREATEST(0, following_count - 1) WHERE id = OLD.follower_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER follow_counter
  AFTER INSERT OR DELETE ON follows
  FOR EACH ROW EXECUTE FUNCTION handle_follow();

-- ============================================================
-- LIKE TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION handle_like()
RETURNS TRIGGER AS $$
DECLARE
  v_review_author UUID;
  v_review_restaurant UUID;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.review_id IS NOT NULL THEN
    UPDATE reviews SET like_count = like_count + 1 WHERE id = NEW.review_id;

    SELECT user_id, restaurant_id INTO v_review_author, v_review_restaurant
    FROM reviews WHERE id = NEW.review_id;

    IF v_review_author != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, title, body, data)
      VALUES (
        v_review_author,
        NEW.user_id,
        'like_review',
        'Someone liked your review',
        (SELECT display_name FROM users WHERE id = NEW.user_id) || ' liked your review',
        jsonb_build_object(
          'review_id', NEW.review_id,
          'restaurant_id', v_review_restaurant
        )
      );
    END IF;

    -- Update food passport likes received
    UPDATE food_passports SET
      total_likes_received = total_likes_received + 1
    WHERE user_id = v_review_author;

  ELSIF TG_OP = 'DELETE' AND OLD.review_id IS NOT NULL THEN
    UPDATE reviews SET like_count = GREATEST(0, like_count - 1) WHERE id = OLD.review_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER like_handler
  AFTER INSERT OR DELETE ON likes
  FOR EACH ROW EXECUTE FUNCTION handle_like();

-- ============================================================
-- COMMENT COUNT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_comment()
RETURNS TRIGGER AS $$
DECLARE
  v_review_author UUID;
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE reviews SET comment_count = comment_count + 1 WHERE id = NEW.review_id;

    SELECT user_id INTO v_review_author FROM reviews WHERE id = NEW.review_id;

    IF v_review_author != NEW.user_id THEN
      INSERT INTO notifications (user_id, actor_id, type, title, body, data)
      VALUES (
        v_review_author,
        NEW.user_id,
        'comment',
        'New comment',
        (SELECT display_name FROM users WHERE id = NEW.user_id) || ' commented on your review',
        jsonb_build_object('review_id', NEW.review_id, 'comment_id', NEW.id)
      );
    END IF;

  ELSIF TG_OP = 'DELETE' THEN
    UPDATE reviews SET comment_count = GREATEST(0, comment_count - 1) WHERE id = OLD.review_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER comment_handler
  AFTER INSERT OR DELETE ON comments
  FOR EACH ROW EXECUTE FUNCTION handle_comment();

-- ============================================================
-- LIST ITEM COUNT TRIGGER
-- ============================================================

CREATE OR REPLACE FUNCTION handle_list_item_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lists SET
      restaurant_count = restaurant_count + 1,
      updated_at = NOW()
    WHERE id = NEW.list_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lists SET
      restaurant_count = GREATEST(0, restaurant_count - 1),
      updated_at = NOW()
    WHERE id = OLD.list_id;
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER list_item_count
  AFTER INSERT OR DELETE ON list_items
  FOR EACH ROW EXECUTE FUNCTION handle_list_item_change();

-- ============================================================
-- TASTE SIMILARITY CALCULATION FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_taste_similarity(p_user_id_1 UUID, p_user_id_2 UUID)
RETURNS DECIMAL(5,4) AS $$
DECLARE
  v_similarity DECIMAL(5,4) := 0;
  v_common_count INTEGER;
  v_dot_product DECIMAL;
  v_norm1 DECIMAL;
  v_norm2 DECIMAL;
BEGIN
  -- Ensure consistent ordering
  IF p_user_id_1 > p_user_id_2 THEN
    RETURN calculate_taste_similarity(p_user_id_2, p_user_id_1);
  END IF;

  -- Count common restaurants and calculate cosine similarity on ratings
  WITH user1_ratings AS (
    SELECT restaurant_id, rating FROM reviews WHERE user_id = p_user_id_1 AND is_public = true
  ),
  user2_ratings AS (
    SELECT restaurant_id, rating FROM reviews WHERE user_id = p_user_id_2 AND is_public = true
  ),
  common AS (
    SELECT u1.restaurant_id, u1.rating AS r1, u2.rating AS r2
    FROM user1_ratings u1
    INNER JOIN user2_ratings u2 ON u1.restaurant_id = u2.restaurant_id
  )
  SELECT
    COUNT(*),
    SUM(r1 * r2),
    SQRT(SUM(r1 * r1)),
    SQRT(SUM(r2 * r2))
  INTO v_common_count, v_dot_product, v_norm1, v_norm2
  FROM common;

  IF v_common_count >= 3 AND v_norm1 > 0 AND v_norm2 > 0 THEN
    v_similarity := LEAST(1.0, v_dot_product / (v_norm1 * v_norm2));
  ELSIF v_common_count > 0 THEN
    -- Partial similarity for few common restaurants
    v_similarity := LEAST(0.3, v_common_count * 0.05);
  END IF;

  -- Upsert similarity record
  INSERT INTO taste_similarity (user_id_1, user_id_2, similarity_score, common_restaurants, last_calculated)
  VALUES (
    LEAST(p_user_id_1, p_user_id_2),
    GREATEST(p_user_id_1, p_user_id_2),
    v_similarity,
    COALESCE(v_common_count, 0),
    NOW()
  )
  ON CONFLICT (user_id_1, user_id_2)
  DO UPDATE SET
    similarity_score = v_similarity,
    common_restaurants = COALESCE(v_common_count, 0),
    last_calculated = NOW();

  RETURN v_similarity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GET HOME FEED FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_home_feed(
  p_user_id UUID,
  p_limit INTEGER DEFAULT 20,
  p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
  event_id UUID,
  event_type feed_item_type,
  created_at TIMESTAMPTZ,
  actor_id UUID,
  actor_username TEXT,
  actor_display_name TEXT,
  actor_avatar_url TEXT,
  restaurant_id UUID,
  restaurant_name TEXT,
  restaurant_cover_url TEXT,
  restaurant_category TEXT,
  review_id UUID,
  review_rating DECIMAL,
  review_content TEXT,
  review_photos TEXT[],
  review_like_count INTEGER,
  review_comment_count INTEGER,
  list_id UUID,
  list_title TEXT,
  badge_name TEXT,
  data JSONB
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ae.id AS event_id,
    ae.type AS event_type,
    ae.created_at,
    u.id AS actor_id,
    u.username AS actor_username,
    u.display_name AS actor_display_name,
    u.avatar_url AS actor_avatar_url,
    r.id AS restaurant_id,
    r.name AS restaurant_name,
    r.cover_photo_url AS restaurant_cover_url,
    r.category::TEXT AS restaurant_category,
    rv.id AS review_id,
    rv.rating AS review_rating,
    rv.content AS review_content,
    rv.photos AS review_photos,
    rv.like_count AS review_like_count,
    rv.comment_count AS review_comment_count,
    l.id AS list_id,
    l.title AS list_title,
    b.name AS badge_name,
    ae.data
  FROM activity_events ae
  INNER JOIN follows f ON f.following_id = ae.user_id AND f.follower_id = p_user_id
  INNER JOIN users u ON u.id = ae.user_id
  LEFT JOIN restaurants r ON r.id = ae.restaurant_id
  LEFT JOIN reviews rv ON rv.id = ae.review_id
  LEFT JOIN lists l ON l.id = ae.list_id
  LEFT JOIN badges b ON b.id = ae.badge_id
  WHERE ae.is_public = true
    AND ae.created_at > NOW() - INTERVAL '30 days'
  ORDER BY ae.created_at DESC
  LIMIT p_limit
  OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- GENERATE RECOMMENDATIONS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION generate_recommendations(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_restaurant RECORD;
  v_score DECIMAL;
BEGIN
  -- Clear old recommendations
  DELETE FROM recommendations
  WHERE user_id = p_user_id
    AND generated_at < NOW() - INTERVAL '24 hours';

  -- 1. From taste-matched users
  INSERT INTO recommendations (user_id, restaurant_id, score, reason, reason_data)
  SELECT DISTINCT ON (r.id)
    p_user_id,
    r.id,
    ts.similarity_score * rv.rating AS score,
    'taste_match',
    jsonb_build_object(
      'similar_user_id', similar_user.id,
      'similar_user_name', similar_user.display_name,
      'match_score', ROUND((ts.similarity_score * 100)::NUMERIC, 0)
    )
  FROM taste_similarity ts
  INNER JOIN users similar_user ON similar_user.id = CASE
    WHEN ts.user_id_1 = p_user_id THEN ts.user_id_2
    ELSE ts.user_id_1
  END
  INNER JOIN reviews rv ON rv.user_id = similar_user.id AND rv.rating >= 4.0
  INNER JOIN restaurants r ON r.id = rv.restaurant_id AND r.is_approved = true
  WHERE (ts.user_id_1 = p_user_id OR ts.user_id_2 = p_user_id)
    AND ts.similarity_score > 0.5
    AND r.id NOT IN (SELECT restaurant_id FROM reviews WHERE user_id = p_user_id)
    AND r.id NOT IN (SELECT restaurant_id FROM recommendations WHERE user_id = p_user_id AND NOT is_dismissed)
  ORDER BY r.id, score DESC
  LIMIT 20
  ON CONFLICT (user_id, restaurant_id) DO UPDATE SET
    score = EXCLUDED.score,
    reason = EXCLUDED.reason,
    reason_data = EXCLUDED.reason_data,
    generated_at = NOW();

  -- 2. From friends' visits (restaurants friends visited but user hasn't)
  INSERT INTO recommendations (user_id, restaurant_id, score, reason, reason_data)
  SELECT DISTINCT ON (r.id)
    p_user_id,
    r.id,
    COUNT(*) * 2.0 AS score,
    'friends_visited',
    jsonb_build_object('friend_count', COUNT(*))
  FROM follows f
  INNER JOIN visits v ON v.user_id = f.following_id
  INNER JOIN restaurants r ON r.id = v.restaurant_id AND r.is_approved = true
  WHERE f.follower_id = p_user_id
    AND r.id NOT IN (SELECT restaurant_id FROM reviews WHERE user_id = p_user_id)
  GROUP BY r.id
  HAVING COUNT(*) >= 2
  ORDER BY r.id, score DESC
  LIMIT 20
  ON CONFLICT (user_id, restaurant_id) DO UPDATE SET
    score = GREATEST(recommendations.score, EXCLUDED.score),
    generated_at = NOW();

  -- 3. Trending nearby (high recent activity)
  INSERT INTO recommendations (user_id, restaurant_id, score, reason, reason_data)
  SELECT DISTINCT ON (r.id)
    p_user_id,
    r.id,
    r.popularity_score * 0.1 AS score,
    'trending',
    jsonb_build_object('popularity_score', r.popularity_score)
  FROM restaurants r
  WHERE r.is_approved = true
    AND r.overall_rating >= 4.0
    AND r.total_reviews >= 5
    AND r.id NOT IN (SELECT restaurant_id FROM reviews WHERE user_id = p_user_id)
    AND r.id NOT IN (SELECT restaurant_id FROM recommendations WHERE user_id = p_user_id AND NOT is_dismissed)
  ORDER BY r.id, r.popularity_score DESC
  LIMIT 10
  ON CONFLICT (user_id, restaurant_id) DO NOTHING;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- DETERMINE TASTE PROFILE FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION determine_taste_profile(p_user_id UUID)
RETURNS taste_profile_type AS $$
DECLARE
  v_profile taste_profile_type;
  v_cafe_count INTEGER;
  v_hawker_count INTEGER;
  v_fine_dining_count INTEGER;
  v_night_count INTEGER;
  v_total INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total FROM reviews WHERE user_id = p_user_id;

  IF v_total < 5 THEN
    RETURN 'omnivore';
  END IF;

  SELECT COUNT(*) INTO v_cafe_count
  FROM reviews rv JOIN restaurants r ON r.id = rv.restaurant_id
  WHERE rv.user_id = p_user_id AND r.category = 'cafe';

  SELECT COUNT(*) INTO v_hawker_count
  FROM reviews rv JOIN restaurants r ON r.id = rv.restaurant_id
  WHERE rv.user_id = p_user_id AND r.category IN ('hawker', 'mamak', 'food_court');

  SELECT COUNT(*) INTO v_fine_dining_count
  FROM reviews rv JOIN restaurants r ON r.id = rv.restaurant_id
  WHERE rv.user_id = p_user_id AND r.category = 'fine_dining';

  IF v_cafe_count::FLOAT / v_total > 0.4 THEN v_profile := 'cafe_explorer';
  ELSIF v_hawker_count::FLOAT / v_total > 0.4 THEN v_profile := 'hawker_hunter';
  ELSIF v_fine_dining_count::FLOAT / v_total > 0.3 THEN v_profile := 'fine_dining_enthusiast';
  ELSE v_profile := 'omnivore';
  END IF;

  UPDATE users SET taste_profile = v_profile WHERE id = p_user_id;

  RETURN v_profile;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- BADGE CHECKING FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION check_and_award_badges(p_user_id UUID)
RETURNS VOID AS $$
DECLARE
  v_badge RECORD;
  v_passport food_passports%ROWTYPE;
  v_user users%ROWTYPE;
  v_should_award BOOLEAN;
BEGIN
  SELECT * INTO v_passport FROM food_passports WHERE user_id = p_user_id;
  SELECT * INTO v_user FROM users WHERE id = p_user_id;

  FOR v_badge IN SELECT * FROM badges WHERE is_active = true LOOP
    -- Skip already earned badges
    IF EXISTS (SELECT 1 FROM user_badges WHERE user_id = p_user_id AND badge_id = v_badge.id) THEN
      CONTINUE;
    END IF;

    v_should_award := false;

    CASE v_badge.requirement_type
      WHEN 'restaurants_visited' THEN
        v_should_award := v_passport.restaurants_visited >= v_badge.requirement_count;
      WHEN 'reviews_written' THEN
        v_should_award := v_passport.reviews_written >= v_badge.requirement_count;
      WHEN 'cities_visited' THEN
        v_should_award := array_length(v_passport.cities_visited, 1) >= v_badge.requirement_count;
      WHEN 'followers' THEN
        v_should_award := v_user.follower_count >= v_badge.requirement_count;
      WHEN 'lists_created' THEN
        v_should_award := v_passport.lists_created >= v_badge.requirement_count;
      ELSE
        v_should_award := false;
    END CASE;

    IF v_should_award THEN
      INSERT INTO user_badges (user_id, badge_id) VALUES (p_user_id, v_badge.id)
      ON CONFLICT DO NOTHING;

      -- Notify user
      INSERT INTO notifications (user_id, type, title, body, data)
      VALUES (
        p_user_id,
        'badge_earned',
        'Badge earned: ' || v_badge.name,
        v_badge.description,
        jsonb_build_object('badge_id', v_badge.id, 'badge_slug', v_badge.slug)
      );

      -- Add to activity feed
      INSERT INTO activity_events (user_id, type, badge_id)
      VALUES (p_user_id, 'badge_earned', v_badge.id);
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- NEARBY RESTAURANTS FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION get_nearby_restaurants(
  p_lat DECIMAL,
  p_lng DECIMAL,
  p_radius_km DECIMAL DEFAULT 5.0,
  p_limit INTEGER DEFAULT 20
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  category TEXT,
  overall_rating DECIMAL,
  total_reviews INTEGER,
  cover_photo_url TEXT,
  address TEXT,
  distance_km DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    r.id,
    r.name,
    r.category::TEXT,
    r.overall_rating,
    r.total_reviews,
    r.cover_photo_url,
    r.address,
    ROUND(
      (ST_Distance(
        r.location::geography,
        ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
      ) / 1000)::NUMERIC, 2
    ) AS distance_km
  FROM restaurants r
  WHERE r.is_approved = true
    AND r.is_active = true
    AND r.location IS NOT NULL
    AND ST_DWithin(
      r.location::geography,
      ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
      p_radius_km * 1000
    )
  ORDER BY distance_km ASC, r.overall_rating DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
