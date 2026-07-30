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

/**
 * A dish only surfaces publicly for a restaurant once at least this many distinct
 * users have tagged it there (tag_count == distinct-user count). Restaurants that
 * already have real dish ratings surface regardless of tags.
 */
export const MIN_TAGS_TO_SURFACE = 2;

export async function getTopRestaurantsForDish(dishId: string, limit = 10): Promise<RestaurantDishEntry[]> {
  const { data, error } = await supabase
    .from('restaurant_dishes')
    .select(`
      *,
      restaurant:restaurants(*)
    `)
    .eq('dish_id', dishId)
    .eq('is_available', true)
    // Surface a restaurant if it has real dish ratings OR enough community tags.
    .or(`rating_count.gte.1,tag_count.gte.${MIN_TAGS_TO_SURFACE}`)
    // signal_score = rating_count + tag_count (generated column, migration 010).
    .order('signal_score', { ascending: false })
    .order('average_rating', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as RestaurantDishEntry[];
}

/**
 * Tags a dish at a restaurant for a user (fire-and-forget from the review flow).
 * Pass a canonical `dishId` when known, or a free-text `dishName` to create the
 * dish if it doesn't exist. No coins — tagging is un-farmable engagement.
 * Runs through the SECURITY DEFINER `tag_dish` RPC. Returns the dish id or null.
 */
export async function tagDish(params: {
  userId: string;
  restaurantId: string;
  dishId?: string;
  dishName?: string;
}): Promise<string | null> {
  const { data, error } = await supabase.rpc('tag_dish', {
    p_user_id: params.userId,
    p_restaurant_id: params.restaurantId,
    p_dish_id: params.dishId ?? null,
    p_dish_name: params.dishName ?? null,
  });

  if (error) {
    console.error('[tagDish]', error);
    return null;
  }
  return (data as string) ?? null;
}

/**
 * The dishes a user tagged at a restaurant (from the dish graph). Used to
 * pre-fill the review editor for reviews created before dish tags were also
 * stored on the review row (dishes_mentioned).
 */
export async function getUserDishTagsForRestaurant(
  userId: string,
  restaurantId: string,
): Promise<{ id: string; name: string }[]> {
  const { data } = await supabase
    .from('restaurant_dish_tags')
    .select('dish_id, dishes:dishes!dish_id ( id, name )')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
  return ((data ?? []) as any[])
    .map(r => ({ id: r.dishes?.id ?? r.dish_id, name: r.dishes?.name as string }))
    .filter(d => !!d.name);
}

export async function getTopDishes(limit = 10): Promise<Dish[]> {
  const { data, error } = await supabase
    .from('dishes')
    .select('*')
    .gte('total_ratings', 1)
    .order('average_rating', { ascending: false })
    .order('total_ratings', { ascending: false })
    .limit(limit);

  if (error || !data) return [];
  return data as Dish[];
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
