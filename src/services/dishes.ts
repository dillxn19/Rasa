import { supabase } from '@/lib/supabase';
import type { Dish, RestaurantDishEntry, FoodTagCount, FoodTagType } from '@/types';
import type { DbDishRating } from '@/types/database';

// ─── Fetch ───────────────────────────────────────────────────

export async function getDishBySlug(slug: string, userId?: string): Promise<Dish | null> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  const [topRestaurants, userRating, isSaved] = await Promise.all([
    getTopRestaurantsForDish(data.id),
    userId ? getUserDishRating(userId, data.id) : null,
    userId ? isDishSaved(userId, data.id) : false,
  ]);

  return {
    ...data,
    top_restaurants: topRestaurants,
    user_rating: userRating,
    is_saved: isSaved,
  };
}

export async function getDishById(id: string, userId?: string): Promise<Dish | null> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const [topRestaurants, userRating, isSaved] = await Promise.all([
    getTopRestaurantsForDish(id),
    userId ? getUserDishRating(userId, id) : null,
    userId ? isDishSaved(userId, id) : false,
  ]);

  return {
    ...data,
    top_restaurants: topRestaurants,
    user_rating: userRating,
    is_saved: isSaved,
  };
}

export async function getTopRestaurantsForDish(dishId: string, limit = 10): Promise<RestaurantDishEntry[]> {
  const { data, error } = await supabase
    .from('restaurant_dishes')
    .select(`
      *,
      restaurant:restaurants(*)
    `)
    .eq('dish_id', dishId)
    .eq('is_available', true)
    .order('rating_count', { ascending: false })
    .order('average_rating', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as RestaurantDishEntry[];
}

export async function getFeaturedDishes(limit = 12): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .eq('is_featured', true)
    .order('total_ratings', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Dish[];
}

export async function getDishesByMealTime(mealTime: string, limit = 10): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .contains('best_meal_times', [mealTime])
    .order('average_rating', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Dish[];
}

export async function searchDishes(query: string, limit = 20): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .or(`name.ilike.%${query}%,name_bm.ilike.%${query}%,name_zh.ilike.%${query}%`)
    .order('total_ratings', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Dish[];
}

// ─── User interactions ────────────────────────────────────────

export async function getUserDishRating(userId: string, dishId: string): Promise<DbDishRating | null> {
  const { data } = await supabase
    .from('dish_ratings')
    .select('*')
    .eq('user_id', userId)
    .eq('dish_id', dishId)
    .maybeSingle();

  return data ?? null;
}

export async function isDishSaved(userId: string, dishId: string): Promise<boolean> {
  const { data } = await supabase
    .from('dish_saves')
    .select('id')
    .eq('user_id', userId)
    .eq('dish_id', dishId)
    .maybeSingle();

  return !!data;
}

export async function rateDish(params: {
  userId: string;
  dishId: string;
  restaurantId: string;
  rating: number;
  note?: string;
  photoUrl?: string;
  isPublic?: boolean;
}): Promise<DbDishRating | null> {
  const { data, error } = await supabase
    .from('dish_ratings')
    .upsert({
      user_id: params.userId,
      dish_id: params.dishId,
      restaurant_id: params.restaurantId,
      rating: params.rating,
      note: params.note ?? null,
      photo_url: params.photoUrl ?? null,
      is_public: params.isPublic ?? true,
    }, { onConflict: 'user_id,dish_id,restaurant_id' })
    .select()
    .single();

  if (error) {
    console.error('[rateDish]', error);
    return null;
  }
  return data as DbDishRating;
}

export async function saveDish(userId: string, dishId: string): Promise<boolean> {
  const { error } = await supabase
    .from('dish_saves')
    .insert({ user_id: userId, dish_id: dishId });

  return !error;
}

export async function unsaveDish(userId: string, dishId: string): Promise<boolean> {
  const { error } = await supabase
    .from('dish_saves')
    .delete()
    .eq('user_id', userId)
    .eq('dish_id', dishId);

  return !error;
}

// ─── Food Tags ────────────────────────────────────────────────

export async function getRestaurantFoodTags(restaurantId: string, userId?: string): Promise<FoodTagCount[]> {
  // Use the restaurant_tag_counts view
  const { data, error } = await supabase
    .from('restaurant_tag_counts')
    .select('tag, count')
    .eq('restaurant_id', restaurantId)
    .order('count', { ascending: false });

  if (error || !data) return [];

  // If user is provided, also check which tags they've applied
  let userTags: string[] = [];
  if (userId) {
    const { data: userTagData } = await supabase
      .from('restaurant_food_tags')
      .select('tag')
      .eq('restaurant_id', restaurantId)
      .eq('user_id', userId);

    userTags = (userTagData ?? []).map(t => t.tag as string);
  }

  return data.map(row => ({
    tag: row.tag as FoodTagType,
    count: row.count as number,
    user_has_tagged: userTags.includes(row.tag),
  }));
}

export async function toggleFoodTag(
  userId: string,
  restaurantId: string,
  tag: FoodTagType
): Promise<{ added: boolean }> {
  // Check if already tagged
  const { data: existing } = await supabase
    .from('restaurant_food_tags')
    .select('id')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .eq('tag', tag)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('restaurant_food_tags')
      .delete()
      .eq('id', existing.id);
    return { added: false };
  }

  await supabase
    .from('restaurant_food_tags')
    .insert({ user_id: userId, restaurant_id: restaurantId, tag });

  return { added: true };
}

// ─── User's saved dishes ──────────────────────────────────────

export async function getUserSavedDishes(userId: string, limit = 20): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dish_saves')
    .select(`
      dish_id,
      dish:dishes(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data.map(d => (d as { dish: Dish }).dish).filter(Boolean);
}
