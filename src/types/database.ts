// Auto-generated types from Supabase schema
// Run: npm run supabase:gen-types to regenerate

export type MealTime = 'breakfast' | 'brunch' | 'lunch' | 'tea' | 'dinner' | 'supper' | 'anytime';

export type DishCategory =
  | 'rice' | 'noodles' | 'bread' | 'grilled' | 'fried'
  | 'soup' | 'curry' | 'salad' | 'seafood' | 'meat'
  | 'dim_sum' | 'dessert' | 'drinks' | 'snacks' | 'other';

export type FoodTagType =
  | 'must_try' | 'hidden_gem' | 'worth_the_queue' | 'great_value'
  | 'late_night' | 'date_spot' | 'family_friendly' | 'tourist_friendly'
  | 'overrated' | 'study_spot' | 'instagrammable' | 'cheap_and_good'
  | 'breakfast_spot' | 'supper_spot' | 'outdoor_seating' | 'no_queue';

export type TrailDifficulty = 'easy' | 'moderate' | 'hardcore';
export type TrailType = 'curated' | 'user_created' | 'community';

export interface DbDish {
  id: string;
  name: string;
  name_bm: string | null;
  name_zh: string | null;
  slug: string;
  description: string | null;
  category: DishCategory;
  cuisine_type: CuisineType | null;
  best_meal_times: MealTime[];
  cover_photo_url: string | null;
  is_halal_by_default: boolean;
  is_vegetarian_by_default: boolean;
  fun_fact: string | null;
  total_ratings: number;
  average_rating: number;
  total_restaurant_count: number;
  is_featured: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbRestaurantDish {
  id: string;
  restaurant_id: string;
  dish_id: string;
  local_name: string | null;
  price: number | null;
  photo_url: string | null;
  is_signature: boolean;
  is_available: boolean;
  average_rating: number;
  rating_count: number;
  added_by: string | null;
  created_at: string;
}

export interface DbDishRating {
  id: string;
  user_id: string;
  dish_id: string;
  restaurant_id: string;
  rating: number;
  note: string | null;
  photo_url: string | null;
  is_public: boolean;
  created_at: string;
}

export interface DbRestaurantFoodTag {
  id: string;
  user_id: string;
  restaurant_id: string;
  tag: FoodTagType;
  created_at: string;
}

export interface DbFoodTrail {
  id: string;
  created_by: string | null;
  title: string;
  title_bm: string | null;
  slug: string;
  description: string;
  cover_photo_url: string | null;
  city: string;
  state: string | null;
  difficulty: TrailDifficulty;
  trail_type: TrailType;
  estimated_duration_hours: number | null;
  estimated_cost_myr: number | null;
  best_time: string | null;
  best_meal_times: MealTime[];
  cuisines: CuisineType[];
  tags: string[];
  is_published: boolean;
  is_featured: boolean;
  total_stops: number;
  follower_count: number;
  completion_count: number;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbFoodTrailStop {
  id: string;
  trail_id: string;
  restaurant_id: string;
  position: number;
  recommended_dish_id: string | null;
  tip: string | null;
  estimated_spend_myr: number | null;
  is_optional: boolean;
}

export interface DbUserTrailProgress {
  id: string;
  user_id: string;
  trail_id: string;
  completed_stops: string[];
  is_completed: boolean;
  completed_at: string | null;
  started_at: string;
}

export type CuisineType =
  | 'malay' | 'chinese' | 'indian' | 'mamak' | 'nyonya'
  | 'japanese' | 'korean' | 'western' | 'italian' | 'thai'
  | 'vietnamese' | 'middle_eastern' | 'fusion' | 'hawker'
  | 'seafood' | 'vegetarian' | 'dessert' | 'bakery' | 'cafe' | 'other';

export type RestaurantCategory =
  | 'hawker' | 'mamak' | 'cafe' | 'kopitiam' | 'restaurant'
  | 'fine_dining' | 'food_court' | 'night_market' | 'rooftop'
  | 'bar' | 'fast_food' | 'buffet' | 'food_truck';

export type PriceRange = '$' | '$$' | '$$$' | '$$$$';

export type DietaryOption =
  | 'halal_certified' | 'muslim_friendly' | 'pork_free'
  | 'vegetarian' | 'vegan' | 'gluten_free' | 'nut_free';

export type NotificationType =
  | 'follow' | 'like_review' | 'comment' | 'mention'
  | 'taste_match' | 'friend_visit' | 'friend_review'
  | 'friend_list' | 'milestone' | 'recommendation'
  | 'badge_earned' | 'list_invite' | 'weekly_digest';

export type BadgeCategory = 'explorer' | 'social' | 'foodie' | 'milestone' | 'special';

export type ListVisibility = 'public' | 'private' | 'friends_only';

export type TasteProfileType =
  | 'hawker_hunter' | 'cafe_explorer' | 'fine_dining_enthusiast'
  | 'spice_lover' | 'street_food_king' | 'dessert_devotee'
  | 'hidden_gem_seeker' | 'social_foodie' | 'health_conscious'
  | 'omnivore' | 'night_owl_eater';

export type FeedItemType =
  | 'review' | 'visit' | 'list_created' | 'list_updated'
  | 'badge_earned' | 'milestone' | 'recommendation';

// ============================================================
// DATABASE ROW TYPES
// ============================================================

export interface DbUser {
  id: string;
  auth_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_url: string | null;
  city: string;
  country: string;
  website_url: string | null;
  instagram_handle: string | null;
  taste_profile: TasteProfileType | null;
  taste_score: number;
  is_verified: boolean;
  is_admin: boolean;
  is_active: boolean;
  onboarding_completed: boolean;
  push_token: string | null;
  preferred_language: string;
  dietary_preferences: DietaryOption[];
  favorite_cuisines: CuisineType[];
  location_lat: number | null;
  location_lng: number | null;
  total_visits: number;
  total_reviews: number;
  total_lists: number;
  follower_count: number;
  following_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbRestaurant {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: RestaurantCategory;
  cuisines: CuisineType[];
  price_range: PriceRange;
  dietary_options: DietaryOption[];
  address: string;
  area: string | null;
  city: string;
  state: string | null;
  country: string;
  postal_code: string | null;
  latitude: number | null;
  longitude: number | null;
  phone_number: string | null;
  whatsapp_number: string | null;
  email: string | null;
  website_url: string | null;
  instagram_handle: string | null;
  facebook_url: string | null;
  google_maps_url: string | null;
  waze_url: string | null;
  cover_photo_url: string | null;
  is_approved: boolean;
  is_active: boolean;
  is_claimed: boolean;
  opening_hours: Record<string, { open: string; close: string } | 'closed'>;
  tags: string[];
  overall_rating: number;
  friend_rating: number;
  total_ratings: number;
  total_reviews: number;
  total_visits: number;
  total_saves: number;
  popularity_score: number;
  created_at: string;
  updated_at: string;
}

export interface DbReview {
  id: string;
  user_id: string;
  restaurant_id: string;
  rating: number;
  content: string | null;
  photos: string[];
  dishes_mentioned: string[];
  visit_date: string | null;
  is_public: boolean;
  like_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbVisit {
  id: string;
  user_id: string;
  restaurant_id: string;
  visited_at: string;
  note: string | null;
}

export interface DbFollow {
  id: string;
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface DbLike {
  id: string;
  user_id: string;
  review_id: string | null;
  photo_id: string | null;
  created_at: string;
}

export interface DbComment {
  id: string;
  user_id: string;
  review_id: string;
  parent_id: string | null;
  content: string;
  like_count: number;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbList {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  cover_photo_url: string | null;
  visibility: ListVisibility;
  is_collaborative: boolean;
  city: string | null;
  tags: string[];
  restaurant_count: number;
  follower_count: number;
  view_count: number;
  like_count: number;
  created_at: string;
  updated_at: string;
}

export interface DbListItem {
  id: string;
  list_id: string;
  restaurant_id: string;
  added_by: string;
  note: string | null;
  position: number;
  created_at: string;
}

export interface DbBadge {
  id: string;
  slug: string;
  name: string;
  description: string;
  icon_url: string | null;
  icon_emoji: string | null;
  category: BadgeCategory;
  points: number;
  requirement_type: string | null;
  requirement_count: number | null;
  is_active: boolean;
  created_at: string;
}

export interface DbUserBadge {
  id: string;
  user_id: string;
  badge_id: string;
  earned_at: string;
}

export interface DbTasteSimilarity {
  id: string;
  user_id_1: string;
  user_id_2: string;
  similarity_score: number;
  common_restaurants: number;
  common_cuisines: string[];
  is_mutual_follow: boolean;
  last_calculated: string;
  created_at: string;
}

export interface DbRecommendation {
  id: string;
  user_id: string;
  restaurant_id: string;
  score: number;
  reason: string | null;
  reason_data: Record<string, unknown> | null;
  is_seen: boolean;
  is_dismissed: boolean;
  generated_at: string;
}

export interface DbNotification {
  id: string;
  user_id: string;
  actor_id: string | null;
  type: NotificationType;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  is_pushed: boolean;
  created_at: string;
}

export interface DbFoodPassport {
  id: string;
  user_id: string;
  states_visited: string[];
  cities_visited: string[];
  cuisines_tried: CuisineType[];
  categories_tried: RestaurantCategory[];
  restaurants_visited: number;
  reviews_written: number;
  photos_uploaded: number;
  lists_created: number;
  followers_gained: number;
  total_likes_received: number;
  streak_days: number;
  last_activity_date: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbRestaurantPhoto {
  id: string;
  restaurant_id: string;
  uploaded_by: string;
  url: string;
  thumbnail_url: string | null;
  caption: string | null;
  dish_name: string | null;
  is_cover: boolean;
  is_approved: boolean;
  like_count: number;
  view_count: number;
  created_at: string;
}

export interface DbPopularDish {
  id: string;
  restaurant_id: string;
  name: string;
  description: string | null;
  photo_url: string | null;
  average_price: number | null;
  mention_count: number;
  is_verified: boolean;
  created_at: string;
}

export interface DbActivityEvent {
  id: string;
  user_id: string;
  type: FeedItemType;
  restaurant_id: string | null;
  review_id: string | null;
  list_id: string | null;
  badge_id: string | null;
  data: Record<string, unknown>;
  is_public: boolean;
  created_at: string;
}
