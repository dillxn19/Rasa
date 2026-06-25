import { supabase } from '@/lib/supabase';
import type { Restaurant, Review, RestaurantPhoto, PopularDish, ReviewForm } from '@/types';

// ─── Restaurant queries ───────────────────────────────────────

export async function getRestaurantBySlug(slug: string, userId?: string): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, restaurant_photos(*)')
    .eq('slug', slug)
    .eq('is_approved', true)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Restaurant not found');

  const restaurant = data as Restaurant;

  if (userId) {
    const [savedResult, visitResult] = await Promise.all([
      supabase
        .from('saved_restaurants')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurant.id)
        .single(),
      supabase
        .from('visits')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurant.id)
        .limit(1),
    ]);
    restaurant.is_saved = !!savedResult.data;
    restaurant.is_visited = (visitResult.data?.length ?? 0) > 0;
  }

  return restaurant;
}

export async function getRestaurantById(id: string, userId?: string): Promise<Restaurant> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  if (!data) throw new Error('Restaurant not found');

  const restaurant = data as Restaurant;

  if (userId) {
    const [savedResult] = await Promise.all([
      supabase
        .from('saved_restaurants')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', id)
        .maybeSingle(),
    ]);
    restaurant.is_saved = !!savedResult.data;
  }

  return restaurant;
}

export async function getRestaurantPhotos(restaurantId: string): Promise<RestaurantPhoto[]> {
  const { data, error } = await supabase
    .from('restaurant_photos')
    .select('*, uploaded_by_user:users!uploaded_by(id, username, avatar_url)')
    .eq('restaurant_id', restaurantId)
    .eq('is_approved', true)
    .order('like_count', { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data as RestaurantPhoto[]) ?? [];
}

export async function getPopularDishes(restaurantId: string): Promise<PopularDish[]> {
  const { data, error } = await supabase
    .from('popular_dishes')
    .select('*')
    .eq('restaurant_id', restaurantId)
    .order('mention_count', { ascending: false })
    .limit(10);

  if (error) throw error;
  return (data as PopularDish[]) ?? [];
}

export async function getRestaurantReviews(restaurantId: string, page = 0): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:users!user_id (
        id, username, display_name, avatar_url, taste_profile, is_verified
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_public', true)
    .order('like_count', { ascending: false })
    .order('created_at', { ascending: false })
    .range(page * 20, (page + 1) * 20 - 1);

  if (error) throw error;
  return (data as Review[]) ?? [];
}

export async function getFriendReviews(restaurantId: string, userId: string): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      user:users!user_id (
        id, username, display_name, avatar_url, taste_profile, is_verified
      )
    `)
    .eq('restaurant_id', restaurantId)
    .eq('is_public', true)
    .in('user_id', supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', userId)
    )
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as Review[]) ?? [];
}

export async function getExploreRestaurants(city?: string, page = 0): Promise<Restaurant[]> {
  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('overall_rating', { ascending: false })
    .order('total_reviews', { ascending: false })
    .range(page * 20, (page + 1) * 20 - 1);

  if (city) query = query.eq('city', city);

  const { data, error } = await query;
  if (error) throw error;
  return (data as Restaurant[]) ?? [];
}

export async function getTrendingRestaurants(city: string, limit = 10): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .eq('city', city)
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as Restaurant[]) ?? [];
}

// ─── Restaurant mutations ─────────────────────────────────────

export async function saveRestaurant(userId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_restaurants')
    .insert({ user_id: userId, restaurant_id: restaurantId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function unsaveRestaurant(userId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('saved_restaurants')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}

export async function logVisit(userId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .insert({ user_id: userId, restaurant_id: restaurantId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function submitReview(form: ReviewForm): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .upsert({
      user_id: form.restaurant_id,
      restaurant_id: form.restaurant_id,
      rating: form.rating,
      content: form.content,
      photos: form.photos ?? [],
      dishes_mentioned: form.dishes_mentioned ?? [],
      visit_date: form.visit_date,
      is_public: form.is_public,
    })
    .select()
    .single();

  if (error) throw error;

  // Also log as a visit
  await logVisit(form.restaurant_id, form.restaurant_id).catch(() => {});

  return data as Review;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

export async function likeReview(userId: string, reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .insert({ user_id: userId, review_id: reviewId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function unlikeReview(userId: string, reviewId: string): Promise<void> {
  const { error } = await supabase
    .from('likes')
    .delete()
    .eq('user_id', userId)
    .eq('review_id', reviewId);
  if (error) throw error;
}

export async function getSavedRestaurants(userId: string): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('saved_restaurants')
    .select('restaurant:restaurants(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data?.map(d => d.restaurant) ?? []) as Restaurant[];
}
