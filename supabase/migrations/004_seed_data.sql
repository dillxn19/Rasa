-- ============================================================
-- RASA — Migration 004: Seed Data
-- ============================================================

-- ============================================================
-- BADGES
-- ============================================================

INSERT INTO badges (slug, name, description, icon_emoji, category, points, requirement_type, requirement_count) VALUES
-- Explorer badges
('first_bite', 'First Bite', 'Logged your very first restaurant', '🍽️', 'milestone', 10, 'restaurants_visited', 1),
('explorer_5', 'Explorer', 'Visited 5 different restaurants', '🗺️', 'explorer', 20, 'restaurants_visited', 5),
('adventurer_25', 'Adventurer', 'Visited 25 different restaurants', '🧭', 'explorer', 50, 'restaurants_visited', 25),
('globetrotter_100', 'Food Globetrotter', 'Visited 100 different restaurants', '🌍', 'explorer', 200, 'restaurants_visited', 100),
('veteran_500', 'Food Veteran', 'Visited 500 different restaurants', '🏆', 'explorer', 500, 'restaurants_visited', 500),

-- KL specific
('kl_explorer', 'KL Explorer', 'Discovered restaurants in 10 different KL neighbourhoods', '🏙️', 'explorer', 75, 'cities_visited', 10),
('penang_food_hunter', 'Penang Food Hunter', 'Explored the food scene in Penang', '🦞', 'special', 100, 'cities_visited', 1),
('jb_foodie', 'JB Foodie', 'Explored the food scene in Johor Bahru', '🦀', 'special', 100, 'cities_visited', 1),

-- Category badges
('hawker_master', 'Hawker Master', 'Visited 20 hawker centres', '🍜', 'foodie', 75, 'restaurants_visited', 20),
('cafe_collector', 'Cafe Collector', 'Visited 15 cafes', '☕', 'foodie', 50, 'restaurants_visited', 15),
('mamak_legend', 'Mamak Legend', 'Visited 10 mamak restaurants', '🫓', 'foodie', 50, 'restaurants_visited', 10),
('fine_diner', 'Fine Diner', 'Visited 5 fine dining restaurants', '🥂', 'foodie', 100, 'restaurants_visited', 5),
('night_owl', 'Night Owl', 'Visited 10 night markets', '🌙', 'special', 75, 'restaurants_visited', 10),

-- Social badges
('first_review', 'Food Critic', 'Wrote your first review', '✍️', 'social', 10, 'reviews_written', 1),
('review_10', 'Seasoned Reviewer', 'Wrote 10 reviews', '📝', 'social', 30, 'reviews_written', 10),
('review_50', 'Food Journalist', 'Wrote 50 reviews', '📰', 'social', 100, 'reviews_written', 50),
('review_100', 'Food Critic Pro', 'Wrote 100 reviews', '🏅', 'social', 250, 'reviews_written', 100),

-- Social following
('popular_10', 'Rising Star', 'Gained 10 followers', '⭐', 'social', 20, 'followers', 10),
('popular_100', 'Food Influencer', 'Gained 100 followers', '💫', 'social', 100, 'followers', 100),
('popular_1000', 'Food Celebrity', 'Gained 1,000 followers', '🌟', 'social', 500, 'followers', 1000),

-- List badges
('list_maker', 'List Maker', 'Created your first food list', '📋', 'social', 15, 'lists_created', 1),
('curator', 'Curator', 'Created 5 food lists', '🗂️', 'social', 50, 'lists_created', 5);

-- ============================================================
-- SAMPLE RESTAURANTS (KL, Penang, JB)
-- ============================================================

INSERT INTO restaurants (
  name, slug, description, category, cuisines, price_range, dietary_options,
  address, area, city, state, latitude, longitude,
  cover_photo_url, is_approved, is_active,
  opening_hours, tags, overall_rating, total_ratings, total_reviews, total_visits
) VALUES
(
  'Village Park Restaurant',
  'village-park-restaurant-damansara',
  'Iconic nasi lemak spot in Damansara Uptown. Famous for the best fried chicken in KL.',
  'hawker',
  ARRAY['malay']::cuisine_type[],
  '$',
  ARRAY['halal_certified']::dietary_option[],
  '5, Jalan SS21/1A, Damansara Utama, 47400 Petaling Jaya, Selangor',
  'Damansara Uptown',
  'Petaling Jaya',
  'Selangor',
  3.1390, 101.6217,
  'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=800',
  true, true,
  '{"monday": {"open": "07:00", "close": "17:00"}, "tuesday": {"open": "07:00", "close": "17:00"}, "wednesday": {"open": "07:00", "close": "17:00"}, "thursday": {"open": "07:00", "close": "17:00"}, "friday": {"open": "07:00", "close": "17:00"}, "saturday": {"open": "07:00", "close": "17:00"}, "sunday": "closed"}',
  ARRAY['nasi lemak', 'fried chicken', 'iconic', 'classic', 'must try'],
  4.8, 1200, 1200, 5000
),
(
  'Burger Lab',
  'burger-lab-ttdi',
  'Premium smash burgers using local Malaysian ingredients. The double smash is legendary.',
  'restaurant',
  ARRAY['western', 'fusion']::cuisine_type[],
  '$$',
  ARRAY['halal_certified']::dietary_option[],
  '1F, Jalan Tun Mohd Fuad 3, Taman Tun Dr Ismail, 60000 Kuala Lumpur',
  'TTDI',
  'Kuala Lumpur',
  'Wilayah Persekutuan',
  3.1381, 101.6393,
  'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=800',
  true, true,
  '{"monday": {"open": "11:00", "close": "22:00"}, "tuesday": {"open": "11:00", "close": "22:00"}, "wednesday": {"open": "11:00", "close": "22:00"}, "thursday": {"open": "11:00", "close": "22:00"}, "friday": {"open": "11:00", "close": "23:00"}, "saturday": {"open": "11:00", "close": "23:00"}, "sunday": {"open": "11:00", "close": "22:00"}}',
  ARRAY['smash burger', 'halal', 'premium', 'burgers'],
  4.6, 850, 850, 3200
),
(
  'Kin Kin Chilli Pan Mee',
  'kin-kin-chilli-pan-mee-desa-sri-hartamas',
  'The original dry chilli pan mee restaurant. Signature dish with a poached egg and crispy anchovies.',
  'restaurant',
  ARRAY['chinese']::cuisine_type[],
  '$',
  ARRAY[]::dietary_option[],
  'No. 2, Jalan 26A, Desa Sri Hartamas, 50480 Kuala Lumpur',
  'Desa Sri Hartamas',
  'Kuala Lumpur',
  'Wilayah Persekutuan',
  3.1567, 101.6533,
  'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?w=800',
  true, true,
  '{"monday": {"open": "07:30", "close": "16:00"}, "tuesday": {"open": "07:30", "close": "16:00"}, "wednesday": "closed", "thursday": {"open": "07:30", "close": "16:00"}, "friday": {"open": "07:30", "close": "16:00"}, "saturday": {"open": "07:30", "close": "16:00"}, "sunday": {"open": "07:30", "close": "16:00"}}',
  ARRAY['pan mee', 'chilli', 'noodles', 'classic', 'original'],
  4.7, 980, 980, 4100
),
(
  'Limapulo',
  'limapulo-bukit-bintang',
  'Contemporary Nyonya cuisine in an elegant setting. Modern takes on Peranakan classics.',
  'restaurant',
  ARRAY['nyonya', 'malay']::cuisine_type[],
  '$$$',
  ARRAY['pork_free']::dietary_option[],
  '50, Jalan Imbi, Bukit Bintang, 55100 Kuala Lumpur',
  'Bukit Bintang',
  'Kuala Lumpur',
  'Wilayah Persekutuan',
  3.1434, 101.7148,
  'https://images.unsplash.com/photo-1559314809-0d155014e29e?w=800',
  true, true,
  '{"tuesday": {"open": "12:00", "close": "22:00"}, "wednesday": {"open": "12:00", "close": "22:00"}, "thursday": {"open": "12:00", "close": "22:00"}, "friday": {"open": "12:00", "close": "22:30"}, "saturday": {"open": "11:30", "close": "22:30"}, "sunday": {"open": "11:30", "close": "21:00"}, "monday": "closed"}',
  ARRAY['nyonya', 'peranakan', 'fine dining', 'kuala lumpur'],
  4.5, 420, 420, 1800
),
(
  'The Toast Co',
  'the-toast-co-kl',
  'Premium kaya toast and coffee. A modern kopitiam experience with meticulously sourced coffee.',
  'kopitiam',
  ARRAY['cafe']::cuisine_type[],
  '$',
  ARRAY['vegetarian']::dietary_option[],
  'Lot 2.01, Menara KEN TTDI, Jalan Damansara, 60000 Kuala Lumpur',
  'TTDI',
  'Kuala Lumpur',
  'Wilayah Persekutuan',
  3.1403, 101.6432,
  'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800',
  true, true,
  '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "18:00"}, "saturday": {"open": "09:00", "close": "17:00"}, "sunday": {"open": "09:00", "close": "17:00"}}',
  ARRAY['kaya toast', 'coffee', 'kopitiam', 'modern', 'brunch'],
  4.4, 650, 650, 2900
),
(
  'Hawker 168',
  'hawker-168-sunway',
  'Legendary hawker centre with over 50 stalls. Best char kuey teow in Subang area.',
  'hawker',
  ARRAY['chinese', 'malay', 'indian']::cuisine_type[],
  '$',
  ARRAY[]::dietary_option[],
  'Jalan PJS 11/7, Bandar Sunway, 47500 Petaling Jaya, Selangor',
  'Sunway',
  'Petaling Jaya',
  'Selangor',
  3.0687, 101.6011,
  'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=800',
  true, true,
  '{"monday": {"open": "17:00", "close": "01:00"}, "tuesday": {"open": "17:00", "close": "01:00"}, "wednesday": {"open": "17:00", "close": "01:00"}, "thursday": {"open": "17:00", "close": "01:00"}, "friday": {"open": "17:00", "close": "02:00"}, "saturday": {"open": "17:00", "close": "02:00"}, "sunday": {"open": "17:00", "close": "01:00"}}',
  ARRAY['hawker', 'char kuey teow', 'variety', 'affordable'],
  4.3, 750, 750, 8000
),
(
  'Nathalie''s Gourmet Studio',
  'nathalies-gourmet-studio-kl',
  'French-Malaysian fine dining. Chef Nathalie Arbefeuille crafts exceptional tasting menus.',
  'fine_dining',
  ARRAY['western', 'fusion']::cuisine_type[],
  '$$$$',
  ARRAY[]::dietary_option[],
  '101B, Lorong Maarof, Bangsar, 59000 Kuala Lumpur',
  'Bangsar',
  'Kuala Lumpur',
  'Wilayah Persekutuan',
  3.1286, 101.6764,
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800',
  true, true,
  '{"tuesday": {"open": "12:00", "close": "14:30"}, "wednesday": {"open": "12:00", "close": "14:30"}, "thursday": {"open": "12:00", "close": "14:30"}, "friday": {"open": "12:00", "close": "14:30"}, "saturday": {"open": "12:00", "close": "15:00"}, "monday": "closed", "sunday": "closed"}',
  ARRAY['fine dining', 'french', 'tasting menu', 'bangsar', 'special occasion'],
  4.9, 280, 280, 400
),
-- Penang restaurants
(
  'Lorong Baru (New Lane) Hawker',
  'lorong-baru-hawker-penang',
  'Famous Penang hawker street. Best place for authentic Penang char kuey teow and assam laksa.',
  'hawker',
  ARRAY['chinese', 'malay']::cuisine_type[],
  '$',
  ARRAY[]::dietary_option[],
  'Lorong Baru, 10050 Georgetown, Penang',
  'Georgetown',
  'Penang',
  'Pulau Pinang',
  5.4164, 100.3327,
  'https://images.unsplash.com/photo-1562802378-063ec186a863?w=800',
  true, true,
  '{"monday": {"open": "18:00", "close": "23:00"}, "tuesday": {"open": "18:00", "close": "23:00"}, "wednesday": {"open": "18:00", "close": "23:00"}, "thursday": {"open": "18:00", "close": "23:00"}, "friday": {"open": "18:00", "close": "00:00"}, "saturday": {"open": "18:00", "close": "00:00"}, "sunday": {"open": "18:00", "close": "23:00"}}',
  ARRAY['penang', 'char kuey teow', 'assam laksa', 'hawker', 'iconic'],
  4.7, 920, 920, 6200
),
(
  'Sri Ananda Bahwan',
  'sri-ananda-bahwan-penang',
  'Classic Indian restaurant in Penang serving authentic South Indian cuisine since 1960.',
  'restaurant',
  ARRAY['indian']::cuisine_type[],
  '$',
  ARRAY['vegetarian', 'vegan']::dietary_option[],
  '55, Jalan Penang, 10000 Georgetown, Penang',
  'Georgetown',
  'Penang',
  'Pulau Pinang',
  5.4135, 100.3293,
  'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=800',
  true, true,
  '{"monday": {"open": "07:00", "close": "22:00"}, "tuesday": {"open": "07:00", "close": "22:00"}, "wednesday": {"open": "07:00", "close": "22:00"}, "thursday": {"open": "07:00", "close": "22:00"}, "friday": {"open": "07:00", "close": "22:00"}, "saturday": {"open": "07:00", "close": "22:00"}, "sunday": {"open": "07:00", "close": "22:00"}}',
  ARRAY['indian', 'banana leaf', 'vegetarian', 'penang', 'heritage'],
  4.5, 680, 680, 3800
);

-- ============================================================
-- POPULAR DISHES for sample restaurants
-- ============================================================

INSERT INTO popular_dishes (restaurant_id, name, mention_count, is_verified) VALUES
((SELECT id FROM restaurants WHERE slug = 'village-park-restaurant-damansara'), 'Nasi Lemak', 1200, true),
((SELECT id FROM restaurants WHERE slug = 'village-park-restaurant-damansara'), 'Fried Chicken', 980, true),
((SELECT id FROM restaurants WHERE slug = 'village-park-restaurant-damansara'), 'Sambal Sotong', 450, true),

((SELECT id FROM restaurants WHERE slug = 'burger-lab-ttdi'), 'Double Smash Burger', 850, true),
((SELECT id FROM restaurants WHERE slug = 'burger-lab-ttdi'), 'Truffle Fries', 620, true),
((SELECT id FROM restaurants WHERE slug = 'burger-lab-ttdi'), 'Fried Chicken Burger', 480, true),

((SELECT id FROM restaurants WHERE slug = 'kin-kin-chilli-pan-mee-desa-sri-hartamas'), 'Dry Chilli Pan Mee', 980, true),
((SELECT id FROM restaurants WHERE slug = 'kin-kin-chilli-pan-mee-desa-sri-hartamas'), 'Soup Pan Mee', 420, true),

((SELECT id FROM restaurants WHERE slug = 'the-toast-co-kl'), 'Kaya Butter Toast', 650, true),
((SELECT id FROM restaurants WHERE slug = 'the-toast-co-kl'), 'Soft Boiled Eggs', 580, true),
((SELECT id FROM restaurants WHERE slug = 'the-toast-co-kl'), 'Nanyang Coffee', 720, true),

((SELECT id FROM restaurants WHERE slug = 'lorong-baru-hawker-penang'), 'Char Kuey Teow', 920, true),
((SELECT id FROM restaurants WHERE slug = 'lorong-baru-hawker-penang'), 'Assam Laksa', 780, true),
((SELECT id FROM restaurants WHERE slug = 'lorong-baru-hawker-penang'), 'Hokkien Mee', 560, true);

-- Update restaurant locations using PostGIS
UPDATE restaurants SET location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
