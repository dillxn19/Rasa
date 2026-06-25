// Application-level types (enriched from database types)

import type {
  DbUser, DbRestaurant, DbReview, DbList, DbBadge,
  DbNotification, DbFoodPassport, DbRestaurantPhoto,
  DbPopularDish, DbComment, TasteProfileType,
  RestaurantCategory, CuisineType, DietaryOption, PriceRange,
  FeedItemType, DbActivityEvent,
} from './database';

// Re-export database types
export * from './database';

// ============================================================
// ENRICHED TYPES (with joined relations)
// ============================================================

export interface User extends DbUser {
  is_following?: boolean;
  is_followed_by?: boolean;
  taste_match_score?: number;
  badges?: Badge[];
}

export interface Restaurant extends DbRestaurant {
  photos?: RestaurantPhoto[];
  popular_dishes?: PopularDish[];
  user_review?: Review | null;
  friend_reviews?: Review[];
  is_saved?: boolean;
  is_visited?: boolean;
  distance_km?: number;
  friend_rating?: number;
  similar_user_rating?: number;
}

export interface Review extends DbReview {
  user?: User;
  restaurant?: Restaurant;
  is_liked?: boolean;
  is_own?: boolean;
}

export interface Comment extends DbComment {
  user?: User;
  replies?: Comment[];
  is_liked?: boolean;
}

export interface List extends DbList {
  user?: User;
  items?: ListItem[];
  is_following?: boolean;
}

export interface ListItem {
  id: string;
  list_id: string;
  restaurant_id: string;
  added_by: string;
  note: string | null;
  position: number;
  created_at: string;
  restaurant?: Restaurant;
  added_by_user?: User;
}

export interface Badge extends DbBadge {
  earned_at?: string;
  is_earned?: boolean;
}

export interface Notification extends DbNotification {
  actor?: User;
}

export interface FoodPassport extends DbFoodPassport {
  badges?: Badge[];
  user?: User;
}

export interface RestaurantPhoto extends DbRestaurantPhoto {
  uploaded_by_user?: User;
}

export interface PopularDish extends DbPopularDish {}

// ============================================================
// FEED / ACTIVITY TYPES
// ============================================================

export interface FeedItem {
  id: string;
  type: FeedItemType;
  created_at: string;
  actor: User;
  restaurant?: Restaurant;
  review?: Review;
  list?: List;
  badge?: Badge;
  data?: Record<string, unknown>;
}

// ============================================================
// TASTE MATCH
// ============================================================

export interface TasteMatch {
  user: User;
  match_score: number;
  match_percentage: number;
  common_restaurants: Restaurant[];
  recommended_restaurants: Restaurant[];
}

// ============================================================
// SEARCH RESULTS
// ============================================================

export interface SearchResults {
  restaurants: Restaurant[];
  users: User[];
  lists: List[];
  query: string;
  total: number;
}

export interface AlgoliaRestaurant {
  objectID: string;
  name: string;
  slug: string;
  category: RestaurantCategory;
  cuisines: CuisineType[];
  city: string;
  area: string;
  address: string;
  overall_rating: number;
  total_reviews: number;
  cover_photo_url: string;
  price_range: PriceRange;
  dietary_options: DietaryOption[];
  tags: string[];
  _geoloc?: { lat: number; lng: number };
}

// ============================================================
// FORM TYPES
// ============================================================

export interface LoginForm {
  email: string;
  password: string;
}

export interface RegisterForm {
  email: string;
  password: string;
  display_name: string;
  username: string;
}

export interface OnboardingForm {
  display_name: string;
  username: string;
  bio: string;
  city: string;
  dietary_preferences: DietaryOption[];
  favorite_cuisines: CuisineType[];
}

export interface ReviewForm {
  restaurant_id: string;
  rating: number;
  content?: string;
  photos?: string[];
  dishes_mentioned?: string[];
  visit_date?: string;
  is_public: boolean;
}

export interface CreateListForm {
  title: string;
  description?: string;
  visibility: 'public' | 'private' | 'friends_only';
  is_collaborative: boolean;
  city?: string;
  tags?: string[];
}

export interface RestaurantSubmissionForm {
  name: string;
  category: RestaurantCategory;
  cuisines: CuisineType[];
  price_range: PriceRange;
  dietary_options: DietaryOption[];
  address: string;
  city: string;
  phone_number?: string;
  website_url?: string;
  instagram_handle?: string;
  description?: string;
}

// ============================================================
// RECOMMENDATION TYPES
// ============================================================

export type RecommendationReason =
  | 'taste_match'
  | 'friends_visited'
  | 'trending'
  | 'similar_cuisine'
  | 'nearby'
  | 'hidden_gem';

export interface Recommendation {
  restaurant: Restaurant;
  score: number;
  reason: RecommendationReason;
  reason_label: string;
  reason_data?: {
    similar_user_name?: string;
    match_score?: number;
    friend_count?: number;
    distance_km?: number;
  };
}

export interface RecommendationSection {
  title: string;
  subtitle: string;
  items: Recommendation[];
  type: 'for_you' | 'trending' | 'nearby' | 'hidden_gems' | 'weekend_picks';
}

// ============================================================
// FOOD PASSPORT / GAMIFICATION
// ============================================================

export interface PassportStats {
  restaurants_visited: number;
  reviews_written: number;
  cities_visited: number;
  states_visited: number;
  cuisines_tried: number;
  badges_earned: number;
  lists_created: number;
  followers: number;
  likes_received: number;
}

export const TASTE_PROFILE_LABELS: Record<TasteProfileType, { label: string; emoji: string; description: string }> = {
  hawker_hunter: { label: 'Hawker Hunter', emoji: '🍜', description: 'You live for the streets. The sizzle of the wok, the smoke, the chaos — that\'s your element.' },
  cafe_explorer: { label: 'Cafe Explorer', emoji: '☕', description: 'The perfect flat white, the coziest corner, the most Instagrammable brunch. You always find it.' },
  fine_dining_enthusiast: { label: 'Fine Diner', emoji: '🥂', description: 'You appreciate the finer things. Tasting menus, wine pairings, and tableside service are your love language.' },
  spice_lover: { label: 'Spice Lover', emoji: '🌶️', description: 'The hotter the better. You judge a restaurant by its sambal and you\'ve never once asked for mild.' },
  street_food_king: { label: 'Street Food King', emoji: '👑', description: 'From roadside satay to pasar malam kuih, you know where to find the real hidden gems.' },
  dessert_devotee: { label: 'Dessert Devotee', emoji: '🧁', description: 'Life\'s too short to skip dessert. You plan meals around what comes after the main.' },
  hidden_gem_seeker: { label: 'Hidden Gem Seeker', emoji: '💎', description: 'You\'ve discovered restaurants before they were cool. The ones with no signboard but a 2-hour queue.' },
  social_foodie: { label: 'Social Foodie', emoji: '📸', description: 'Food is better shared. You\'re the one who rallies the group and always knows the best spot.' },
  health_conscious: { label: 'Health Conscious', emoji: '🥗', description: 'Clean eating, good ingredients, and balanced meals. You prove healthy food can be delicious.' },
  omnivore: { label: 'Omnivore', emoji: '🌏', description: 'You eat everything, everywhere. No cuisine is off-limits and no menu goes unread.' },
  night_owl_eater: { label: 'Night Owl', emoji: '🌙', description: 'The best food comes out after midnight. You\'ve mastered the art of the late-night sucha.' },
};

export const CUISINE_LABELS: Record<CuisineType, string> = {
  malay: 'Malay', chinese: 'Chinese', indian: 'Indian', mamak: 'Mamak',
  nyonya: 'Nyonya / Peranakan', japanese: 'Japanese', korean: 'Korean',
  western: 'Western', italian: 'Italian', thai: 'Thai', vietnamese: 'Vietnamese',
  middle_eastern: 'Middle Eastern', fusion: 'Fusion', hawker: 'Hawker',
  seafood: 'Seafood', vegetarian: 'Vegetarian', dessert: 'Desserts & Sweets',
  bakery: 'Bakery', cafe: 'Cafe', other: 'Other',
};

export const CATEGORY_LABELS: Record<RestaurantCategory, string> = {
  hawker: 'Hawker', mamak: 'Mamak', cafe: 'Cafe', kopitiam: 'Kopitiam',
  restaurant: 'Restaurant', fine_dining: 'Fine Dining', food_court: 'Food Court',
  night_market: 'Night Market', rooftop: 'Rooftop Bar', bar: 'Bar',
  fast_food: 'Fast Food', buffet: 'Buffet', food_truck: 'Food Truck',
};

export const DIETARY_LABELS: Record<DietaryOption, string> = {
  halal_certified: 'Halal Certified', muslim_friendly: 'Muslim Friendly',
  pork_free: 'Pork Free', vegetarian: 'Vegetarian', vegan: 'Vegan',
  gluten_free: 'Gluten Free', nut_free: 'Nut Free',
};

export const PRICE_LABELS: Record<PriceRange, string> = {
  '$': 'Under RM20', '$$': 'RM20–50', '$$$': 'RM50–100', '$$$$': 'RM100+',
};

// ─── Dish types ──────────────────────────────────────────────

export interface Dish extends DbDish {
  top_restaurants?: RestaurantDishEntry[];
  user_rating?: DbDishRating | null;
  is_saved?: boolean;
}

export interface RestaurantDishEntry extends DbRestaurantDish {
  restaurant?: Restaurant;
  dish?: Dish;
}

// ─── Food Tags ───────────────────────────────────────────────

export interface FoodTagCount {
  tag: FoodTagType;
  count: number;
  user_has_tagged: boolean;
}

export const FOOD_TAG_LABELS: Record<FoodTagType, string> = {
  must_try: 'Must Try',
  hidden_gem: 'Hidden Gem',
  worth_the_queue: 'Worth The Queue',
  great_value: 'Great Value',
  late_night: 'Late Night Spot',
  date_spot: 'Date Spot',
  family_friendly: 'Family Friendly',
  tourist_friendly: 'Tourist Friendly',
  overrated: 'Overrated',
  study_spot: 'Study Spot',
  instagrammable: 'Instagrammable',
  cheap_and_good: 'Cheap & Good',
  breakfast_spot: 'Breakfast Spot',
  supper_spot: 'Supper Spot',
  outdoor_seating: 'Outdoor Seating',
  no_queue: 'No Queue',
};

export const FOOD_TAG_EMOJIS: Record<FoodTagType, string> = {
  must_try: '🔥',
  hidden_gem: '💎',
  worth_the_queue: '⏳',
  great_value: '💰',
  late_night: '🌙',
  date_spot: '💕',
  family_friendly: '👨‍👩‍👧',
  tourist_friendly: '📍',
  overrated: '😒',
  study_spot: '📚',
  instagrammable: '📸',
  cheap_and_good: '🤑',
  breakfast_spot: '☀️',
  supper_spot: '🌃',
  outdoor_seating: '🌳',
  no_queue: '✅',
};

// ─── Food Trails ─────────────────────────────────────────────

export interface FoodTrail extends DbFoodTrail {
  stops?: FoodTrailStop[];
  creator?: User;
  user_progress?: DbUserTrailProgress | null;
  is_following?: boolean;
}

export interface FoodTrailStop extends DbFoodTrailStop {
  restaurant?: Restaurant;
  recommended_dish?: Dish;
  is_completed?: boolean;
}

// ─── Meal time utilities ──────────────────────────────────────

export type MealTimeKey = 'breakfast' | 'brunch' | 'lunch' | 'tea' | 'dinner' | 'supper';

export const MEAL_TIME_LABELS: Record<MealTimeKey, string> = {
  breakfast: 'Breakfast',
  brunch: 'Brunch',
  lunch: 'Lunch',
  tea: 'Afternoon Tea',
  dinner: 'Dinner',
  supper: 'Supper',
};

export const MEAL_TIME_HOURS: Record<MealTimeKey, { start: number; end: number }> = {
  breakfast: { start: 6, end: 10 },
  brunch:    { start: 10, end: 14 },
  lunch:     { start: 11, end: 15 },
  tea:       { start: 14, end: 18 },
  dinner:    { start: 18, end: 22 },
  supper:    { start: 21, end: 4 },
};

export function getCurrentMealTime(): MealTimeKey {
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 10) return 'breakfast';
  if (hour >= 10 && hour < 12) return 'brunch';
  if (hour >= 11 && hour < 15) return 'lunch';
  if (hour >= 14 && hour < 18) return 'tea';
  if (hour >= 18 && hour < 22) return 'dinner';
  return 'supper';
}

export const MALAYSIA_CITIES = [
  'Kuala Lumpur', 'Petaling Jaya', 'Subang Jaya', 'Shah Alam',
  'Penang', 'Georgetown', 'Johor Bahru', 'Kota Kinabalu',
  'Kuching', 'Ipoh', 'Melaka', 'Seremban', 'Putrajaya',
  'Cyberjaya', 'Klang', 'Ampang', 'Cheras', 'Bangsar',
  'Mont Kiara', 'KLCC', 'Bukit Bintang', 'Damansara',
];
