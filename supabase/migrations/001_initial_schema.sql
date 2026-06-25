-- ============================================================
-- RASA — Social Food Discovery App for Malaysia
-- Migration 001: Initial Schema
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "unaccent";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================
-- ENUMS
-- ============================================================

CREATE TYPE cuisine_type AS ENUM (
  'malay', 'chinese', 'indian', 'mamak', 'nyonya',
  'japanese', 'korean', 'western', 'italian', 'thai',
  'vietnamese', 'middle_eastern', 'fusion', 'hawker',
  'seafood', 'vegetarian', 'dessert', 'bakery', 'cafe', 'other'
);

CREATE TYPE restaurant_category AS ENUM (
  'hawker', 'mamak', 'cafe', 'kopitiam', 'restaurant',
  'fine_dining', 'food_court', 'night_market', 'rooftop',
  'bar', 'fast_food', 'buffet', 'food_truck'
);

CREATE TYPE price_range AS ENUM ('$', '$$', '$$$', '$$$$');

CREATE TYPE dietary_option AS ENUM (
  'halal_certified', 'muslim_friendly', 'pork_free',
  'vegetarian', 'vegan', 'gluten_free', 'nut_free'
);

CREATE TYPE notification_type AS ENUM (
  'follow', 'like_review', 'comment', 'mention',
  'taste_match', 'friend_visit', 'friend_review',
  'friend_list', 'milestone', 'recommendation',
  'badge_earned', 'list_invite', 'weekly_digest'
);

CREATE TYPE badge_category AS ENUM (
  'explorer', 'social', 'foodie', 'milestone', 'special'
);

CREATE TYPE list_visibility AS ENUM ('public', 'private', 'friends_only');

CREATE TYPE taste_profile_type AS ENUM (
  'hawker_hunter', 'cafe_explorer', 'fine_dining_enthusiast',
  'spice_lover', 'street_food_king', 'dessert_devotee',
  'hidden_gem_seeker', 'social_foodie', 'health_conscious',
  'omnivore', 'night_owl_eater'
);

CREATE TYPE feed_item_type AS ENUM (
  'review', 'visit', 'list_created', 'list_updated',
  'badge_earned', 'milestone', 'recommendation'
);

-- ============================================================
-- USERS TABLE
-- ============================================================

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  auth_id UUID UNIQUE NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(30) UNIQUE NOT NULL,
  display_name VARCHAR(100) NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  cover_url TEXT,
  city VARCHAR(100) DEFAULT 'Kuala Lumpur',
  country VARCHAR(50) DEFAULT 'Malaysia',
  website_url TEXT,
  instagram_handle VARCHAR(50),
  taste_profile taste_profile_type,
  taste_score INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT false,
  is_admin BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  onboarding_completed BOOLEAN DEFAULT false,
  push_token TEXT,
  preferred_language VARCHAR(10) DEFAULT 'en',
  dietary_preferences dietary_option[],
  favorite_cuisines cuisine_type[],
  location_lat DECIMAL(10, 8),
  location_lng DECIMAL(11, 8),
  total_visits INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_lists INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_auth_id ON users(auth_id);
CREATE INDEX idx_users_city ON users(city);
CREATE INDEX idx_users_taste_profile ON users(taste_profile);
CREATE INDEX idx_users_search ON users USING gin(to_tsvector('english', display_name || ' ' || COALESCE(username, '') || ' ' || COALESCE(bio, '')));

-- ============================================================
-- RESTAURANTS TABLE
-- ============================================================

CREATE TABLE restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) UNIQUE NOT NULL,
  description TEXT,
  category restaurant_category NOT NULL DEFAULT 'restaurant',
  cuisines cuisine_type[] NOT NULL DEFAULT '{}',
  price_range price_range DEFAULT '$$',
  dietary_options dietary_option[] DEFAULT '{}',
  address TEXT NOT NULL,
  area VARCHAR(100),
  city VARCHAR(100) NOT NULL DEFAULT 'Kuala Lumpur',
  state VARCHAR(100),
  country VARCHAR(50) DEFAULT 'Malaysia',
  postal_code VARCHAR(20),
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  location GEOMETRY(POINT, 4326),
  phone_number VARCHAR(30),
  whatsapp_number VARCHAR(30),
  email VARCHAR(100),
  website_url TEXT,
  instagram_handle VARCHAR(50),
  facebook_url TEXT,
  google_maps_url TEXT,
  waze_url TEXT,
  cover_photo_url TEXT,
  is_approved BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  is_claimed BOOLEAN DEFAULT false,
  claimed_by UUID REFERENCES users(id),
  submitted_by UUID REFERENCES users(id),
  opening_hours JSONB DEFAULT '{}',
  tags TEXT[],
  overall_rating DECIMAL(3,2) DEFAULT 0,
  friend_rating DECIMAL(3,2) DEFAULT 0,
  total_ratings INTEGER DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  total_visits INTEGER DEFAULT 0,
  total_saves INTEGER DEFAULT 0,
  popularity_score DECIMAL(10,4) DEFAULT 0,
  algolia_object_id VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurants_slug ON restaurants(slug);
CREATE INDEX idx_restaurants_city ON restaurants(city);
CREATE INDEX idx_restaurants_category ON restaurants(category);
CREATE INDEX idx_restaurants_location ON restaurants USING gist(location);
CREATE INDEX idx_restaurants_approved ON restaurants(is_approved, is_active);
CREATE INDEX idx_restaurants_rating ON restaurants(overall_rating DESC);
CREATE INDEX idx_restaurants_search ON restaurants USING gin(to_tsvector('english', name || ' ' || COALESCE(description, '') || ' ' || COALESCE(address, '')));
CREATE INDEX idx_restaurants_tags ON restaurants USING gin(tags);
CREATE INDEX idx_restaurants_cuisines ON restaurants USING gin(cuisines);
CREATE INDEX idx_restaurants_dietary ON restaurants USING gin(dietary_options);

-- ============================================================
-- RESTAURANT PHOTOS TABLE
-- ============================================================

CREATE TABLE restaurant_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  caption TEXT,
  dish_name VARCHAR(200),
  is_cover BOOLEAN DEFAULT false,
  is_approved BOOLEAN DEFAULT true,
  like_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_restaurant_photos_restaurant ON restaurant_photos(restaurant_id);
CREATE INDEX idx_restaurant_photos_user ON restaurant_photos(uploaded_by);
CREATE INDEX idx_restaurant_photos_cover ON restaurant_photos(restaurant_id, is_cover) WHERE is_cover = true;

-- ============================================================
-- POPULAR DISHES TABLE
-- ============================================================

CREATE TABLE popular_dishes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  photo_url TEXT,
  average_price DECIMAL(8,2),
  mention_count INTEGER DEFAULT 1,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(restaurant_id, name)
);

CREATE INDEX idx_dishes_restaurant ON popular_dishes(restaurant_id);
CREATE INDEX idx_dishes_mentions ON popular_dishes(restaurant_id, mention_count DESC);

-- ============================================================
-- REVIEWS TABLE
-- ============================================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  rating DECIMAL(2,1) NOT NULL CHECK (rating >= 0.5 AND rating <= 5.0),
  content TEXT,
  photos TEXT[],
  dishes_mentioned TEXT[],
  visit_date DATE,
  is_public BOOLEAN DEFAULT true,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

CREATE INDEX idx_reviews_restaurant ON reviews(restaurant_id, created_at DESC);
CREATE INDEX idx_reviews_user ON reviews(user_id, created_at DESC);
CREATE INDEX idx_reviews_rating ON reviews(restaurant_id, rating DESC);
CREATE INDEX idx_reviews_public ON reviews(is_public, created_at DESC) WHERE is_public = true;

-- ============================================================
-- VISITS TABLE (separate from reviews — can visit without reviewing)
-- ============================================================

CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  visited_at TIMESTAMPTZ DEFAULT NOW(),
  note TEXT,
  UNIQUE(user_id, restaurant_id, visited_at::DATE)
);

CREATE INDEX idx_visits_user ON visits(user_id, visited_at DESC);
CREATE INDEX idx_visits_restaurant ON visits(restaurant_id);

-- ============================================================
-- FOLLOWS TABLE
-- ============================================================

CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_follower ON follows(follower_id);
CREATE INDEX idx_follows_following ON follows(following_id);

-- ============================================================
-- LIKES TABLE (polymorphic)
-- ============================================================

CREATE TABLE likes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  photo_id UUID REFERENCES restaurant_photos(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CHECK (
    (review_id IS NOT NULL AND photo_id IS NULL) OR
    (review_id IS NULL AND photo_id IS NOT NULL)
  ),
  UNIQUE(user_id, review_id),
  UNIQUE(user_id, photo_id)
);

CREATE INDEX idx_likes_user ON likes(user_id);
CREATE INDEX idx_likes_review ON likes(review_id) WHERE review_id IS NOT NULL;
CREATE INDEX idx_likes_photo ON likes(photo_id) WHERE photo_id IS NOT NULL;

-- ============================================================
-- COMMENTS TABLE
-- ============================================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id UUID NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  like_count INTEGER DEFAULT 0,
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_review ON comments(review_id, created_at);
CREATE INDEX idx_comments_user ON comments(user_id);
CREATE INDEX idx_comments_parent ON comments(parent_id) WHERE parent_id IS NOT NULL;

-- ============================================================
-- SAVED RESTAURANTS (Wishlist)
-- ============================================================

CREATE TABLE saved_restaurants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

CREATE INDEX idx_saved_user ON saved_restaurants(user_id, created_at DESC);
CREATE INDEX idx_saved_restaurant ON saved_restaurants(restaurant_id);

-- ============================================================
-- LISTS TABLE
-- ============================================================

CREATE TABLE lists (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  cover_photo_url TEXT,
  visibility list_visibility DEFAULT 'public',
  is_collaborative BOOLEAN DEFAULT false,
  city VARCHAR(100),
  tags TEXT[],
  restaurant_count INTEGER DEFAULT 0,
  follower_count INTEGER DEFAULT 0,
  view_count INTEGER DEFAULT 0,
  like_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_lists_user ON lists(user_id, created_at DESC);
CREATE INDEX idx_lists_public ON lists(visibility, created_at DESC) WHERE visibility = 'public';
CREATE INDEX idx_lists_city ON lists(city);

-- ============================================================
-- LIST ITEMS TABLE
-- ============================================================

CREATE TABLE list_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  added_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  note TEXT,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, restaurant_id)
);

CREATE INDEX idx_list_items_list ON list_items(list_id, position);
CREATE INDEX idx_list_items_restaurant ON list_items(restaurant_id);

-- ============================================================
-- LIST FOLLOWERS TABLE
-- ============================================================

CREATE TABLE list_follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, list_id)
);

-- ============================================================
-- LIST COLLABORATORS TABLE
-- ============================================================

CREATE TABLE list_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  can_edit BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES users(id),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(list_id, user_id)
);

-- ============================================================
-- BADGES TABLE
-- ============================================================

CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  icon_url TEXT,
  icon_emoji VARCHAR(10),
  category badge_category NOT NULL,
  points INTEGER DEFAULT 10,
  requirement_type VARCHAR(50),
  requirement_count INTEGER,
  requirement_data JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- USER BADGES TABLE
-- ============================================================

CREATE TABLE user_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_id)
);

CREATE INDEX idx_user_badges_user ON user_badges(user_id, earned_at DESC);

-- ============================================================
-- TASTE SIMILARITY TABLE
-- ============================================================

CREATE TABLE taste_similarity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_id_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  similarity_score DECIMAL(5,4) NOT NULL DEFAULT 0,
  common_restaurants INTEGER DEFAULT 0,
  common_cuisines TEXT[],
  is_mutual_follow BOOLEAN DEFAULT false,
  last_calculated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2)
);

CREATE INDEX idx_taste_similarity_user1 ON taste_similarity(user_id_1, similarity_score DESC);
CREATE INDEX idx_taste_similarity_user2 ON taste_similarity(user_id_2, similarity_score DESC);
CREATE INDEX idx_taste_similarity_score ON taste_similarity(similarity_score DESC);

-- ============================================================
-- RECOMMENDATIONS TABLE
-- ============================================================

CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  score DECIMAL(8,4) NOT NULL,
  reason VARCHAR(50),
  reason_data JSONB,
  is_seen BOOLEAN DEFAULT false,
  is_dismissed BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, restaurant_id)
);

CREATE INDEX idx_recommendations_user ON recommendations(user_id, score DESC) WHERE NOT is_dismissed;

-- ============================================================
-- NOTIFICATIONS TABLE
-- ============================================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  type notification_type NOT NULL,
  title VARCHAR(200) NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT false,
  is_pushed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, is_read) WHERE NOT is_read;

-- ============================================================
-- FOOD PASSPORT TABLE (gamification)
-- ============================================================

CREATE TABLE food_passports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  states_visited TEXT[] DEFAULT '{}',
  cities_visited TEXT[] DEFAULT '{}',
  cuisines_tried cuisine_type[] DEFAULT '{}',
  categories_tried restaurant_category[] DEFAULT '{}',
  restaurants_visited INTEGER DEFAULT 0,
  reviews_written INTEGER DEFAULT 0,
  photos_uploaded INTEGER DEFAULT 0,
  lists_created INTEGER DEFAULT 0,
  followers_gained INTEGER DEFAULT 0,
  total_likes_received INTEGER DEFAULT 0,
  streak_days INTEGER DEFAULT 0,
  last_activity_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- REPORTS TABLE (moderation)
-- ============================================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  review_id UUID REFERENCES reviews(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT,
  status VARCHAR(20) DEFAULT 'pending',
  resolved_by UUID REFERENCES users(id),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ACTIVITY / FEED EVENTS TABLE
-- ============================================================

CREATE TABLE activity_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type feed_item_type NOT NULL,
  restaurant_id UUID REFERENCES restaurants(id) ON DELETE SET NULL,
  review_id UUID REFERENCES reviews(id) ON DELETE SET NULL,
  list_id UUID REFERENCES lists(id) ON DELETE SET NULL,
  badge_id UUID REFERENCES badges(id) ON DELETE SET NULL,
  data JSONB DEFAULT '{}',
  is_public BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_activity_user ON activity_events(user_id, created_at DESC);
CREATE INDEX idx_activity_public ON activity_events(created_at DESC) WHERE is_public = true;

-- ============================================================
-- UPDATED_AT TRIGGER FUNCTION
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to all tables with updated_at
CREATE TRIGGER users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER restaurants_updated_at BEFORE UPDATE ON restaurants FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER reviews_updated_at BEFORE UPDATE ON reviews FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER lists_updated_at BEFORE UPDATE ON lists FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER comments_updated_at BEFORE UPDATE ON comments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER food_passports_updated_at BEFORE UPDATE ON food_passports FOR EACH ROW EXECUTE FUNCTION update_updated_at();
