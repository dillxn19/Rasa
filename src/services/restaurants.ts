import { supabase } from '@/lib/supabase';
import type { Restaurant, Review, RestaurantPhoto, PopularDish, ReviewForm, AlgoliaRestaurant } from '@/types';

/**
 * Direct-to-Postgres restaurant search. Used as a fallback when Algolia is
 * unavailable, unconfigured, or returns nothing — so search never looks broken
 * even if the index hasn't been seeded. Returns Algolia-shaped hits so callers
 * can treat both sources identically.
 */
export async function searchRestaurantsSupabase(
  query: string,
  opts: { halalOnly?: boolean; limit?: number } = {},
): Promise<AlgoliaRestaurant[]> {
  if (query.trim().length < 2) return [];
  let q = supabase
    .from('restaurants')
    .select('id, name, slug, category, cuisines, city, area, address, overall_rating, total_reviews, cover_photo_url, price_range, dietary_options')
    .eq('is_approved', true)
    .eq('is_active', true)
    .or(`name.ilike.%${query}%,area.ilike.%${query}%,city.ilike.%${query}%`)
    .order('popularity_score', { ascending: false })
    .limit(opts.limit ?? 8);

  if (opts.halalOnly) q = q.contains('dietary_options', ['halal_certified']);

  const { data, error } = await q;
  if (error) throw error;

  return (data ?? []).map((r: any) => ({
    objectID: r.id,
    name: r.name,
    slug: r.slug ?? '',
    category: r.category,
    cuisines: r.cuisines ?? [],
    city: r.city ?? '',
    area: r.area ?? '',
    address: r.address ?? '',
    overall_rating: r.overall_rating ?? 0,
    total_reviews: r.total_reviews ?? 0,
    cover_photo_url: r.cover_photo_url ?? '',
    price_range: r.price_range ?? '',
    dietary_options: r.dietary_options ?? [],
    tags: [],
  })) as AlgoliaRestaurant[];
}

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

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Resolves a restaurant by either its UUID or its slug. Navigation throughout
 * the app pushes `/restaurant/<slug ?? id>`, so the detail screen can receive
 * either form — this handles both transparently.
 */
export async function getRestaurantByIdOrSlug(idOrSlug: string, userId?: string): Promise<Restaurant> {
  return UUID_RE.test(idOrSlug)
    ? getRestaurantById(idOrSlug, userId)
    : getRestaurantBySlug(idOrSlug, userId);
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

export interface CommunityPhoto {
  url: string;
  reviewId: string;
  userId: string;
  username?: string;
  avatarUrl?: string | null;
}

/** All community photos for a restaurant (flattened from public reviews). */
export async function getCommunityPhotos(restaurantId: string, limit = 30): Promise<CommunityPhoto[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, user_id, photos, user:users!user_id ( username, avatar_url )')
    .eq('restaurant_id', restaurantId)
    .eq('is_public', true)
    .not('photos', 'is', null)
    .order('created_at', { ascending: false })
    .limit(60);
  if (error) return [];

  const out: CommunityPhoto[] = [];
  for (const row of (data ?? []) as any[]) {
    for (const url of (row.photos ?? []) as string[]) {
      out.push({
        url,
        reviewId: row.id,
        userId: row.user_id,
        username: row.user?.username,
        avatarUrl: row.user?.avatar_url,
      });
      if (out.length >= limit) return out;
    }
  }
  return out;
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

/** Full restaurant rows for a set of ids, preserving the input order. */
export async function getRestaurantsByIds(ids: string[]): Promise<Restaurant[]> {
  if (ids.length === 0) return [];
  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .in('id', ids)
    .eq('is_active', true);
  const byId = new Map((data ?? []).map((r: any) => [r.id, r as Restaurant]));
  return ids.map(id => byId.get(id)).filter(Boolean) as Restaurant[];
}

export async function getRestaurantsByCategory(
  city: string,
  category: string,
  limit = 50,
): Promise<Restaurant[]> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .eq('city', city)
    .eq('category', category)
    .order('popularity_score', { ascending: false })
    .order('overall_rating', { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data as Restaurant[]) ?? [];
}

/**
 * Popular, well-known restaurants used to seed a new user's taste graph during
 * onboarding. Prefers the user's city (familiar places = more likely they've
 * been) and backfills with top spots elsewhere so the step is never empty.
 */
export async function getOnboardingSeedRestaurants(city?: string, limit = 12): Promise<Restaurant[]> {
  const base = () =>
    supabase
      .from('restaurants')
      .select('*')
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('total_reviews', { ascending: false })
      .order('overall_rating', { ascending: false });

  const seen = new Set<string>();
  const out: Restaurant[] = [];

  if (city) {
    const { data } = await base().eq('city', city).limit(limit);
    for (const r of (data as Restaurant[]) ?? []) {
      if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
    }
  }

  if (out.length < limit) {
    const { data } = await base().limit(limit);
    for (const r of (data as Restaurant[]) ?? []) {
      if (out.length >= limit) break;
      if (!seen.has(r.id)) { seen.add(r.id); out.push(r); }
    }
  }

  return out.slice(0, limit);
}

/**
 * Restaurants near a coordinate, sorted by distance. Uses a lat/lng bounding box
 * (cheap, index-friendly) to prefilter, then sorts client-side by true haversine
 * distance. `radiusKm` defaults to 8km (city-scale). Rows without coordinates are
 * excluded. Returns each restaurant with a `distance_km` field.
 */
export async function getNearbyRestaurants(
  lat: number,
  lng: number,
  opts: { radiusKm?: number; limit?: number; category?: string; halalOnly?: boolean } = {},
): Promise<Restaurant[]> {
  const radiusKm = opts.radiusKm ?? 8;
  const limit = opts.limit ?? 40;
  // Degrees per km: latitude ~1/111; longitude scales by cos(lat).
  const dLat = radiusKm / 111;
  const dLng = radiusKm / (111 * Math.max(0.1, Math.cos((lat * Math.PI) / 180)));

  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .gte('latitude', lat - dLat)
    .lte('latitude', lat + dLat)
    .gte('longitude', lng - dLng)
    .lte('longitude', lng + dLng)
    .limit(200);

  if (opts.category) query = query.eq('category', opts.category);
  if (opts.halalOnly) query = query.contains('dietary_options', ['halal_certified']);

  const { data, error } = await query;
  if (error) throw error;

  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const withDist = ((data as Restaurant[]) ?? [])
    .filter(r => r.latitude != null && r.longitude != null)
    .map(r => {
      const a =
        Math.sin(toRad(r.latitude! - lat) / 2) ** 2 +
        Math.cos(toRad(lat)) * Math.cos(toRad(r.latitude!)) *
          Math.sin(toRad(r.longitude! - lng) / 2) ** 2;
      const distance_km = 2 * R * Math.asin(Math.sqrt(a));
      return { ...r, distance_km };
    })
    .filter(r => (r.distance_km ?? Infinity) <= radiusKm)
    .sort((a, b) => (a.distance_km ?? 0) - (b.distance_km ?? 0))
    .slice(0, limit);

  return withDist;
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

/**
 * Followers-you-follow who have this restaurant on their "want to try" list.
 * Powers the `who_saved` gated feature. Returns the people the current user
 * follows who saved this place.
 */
/** Count of public reviews per star bucket for a restaurant (index 0 = 1★ … 4 = 5★). */
export async function getRestaurantRatingDistribution(restaurantId: string): Promise<number[]> {
  const { data } = await supabase
    .from('reviews')
    .select('rating')
    .eq('restaurant_id', restaurantId)
    .eq('is_public', true);
  const dist = [0, 0, 0, 0, 0];
  for (const r of (data ?? []) as { rating: number }[]) {
    const bucket = Math.min(4, Math.max(0, Math.round(r.rating ?? 0) - 1));
    dist[bucket]++;
  }
  return dist;
}

export async function getFollowersWhoSaved(restaurantId: string, currentUserId: string) {
  const [{ data: savers }, { data: following }] = await Promise.all([
    supabase
      .from('saved_restaurants')
      .select('user:users!user_id(id, username, display_name, avatar_url)')
      .eq('restaurant_id', restaurantId),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId),
  ]);

  const followingIds = new Set((following ?? []).map((f: { following_id: string }) => f.following_id));
  return ((savers ?? []) as { user: { id: string; username: string; display_name: string; avatar_url: string | null } }[])
    .map(s => s.user)
    .filter(u => u && followingIds.has(u.id));
}

export async function logVisit(userId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('visits')
    .insert({ user_id: userId, restaurant_id: restaurantId });
  if (error && !error.message.includes('duplicate')) throw error;
}

export async function getUserReviewForRestaurant(userId: string, restaurantId: string): Promise<Review | null> {
  const { data } = await supabase
    .from('reviews')
    .select('*')
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId)
    .maybeSingle();
  return data as Review | null;
}

export async function submitReview(form: ReviewForm): Promise<Review> {
  const { data, error } = await supabase
    .from('reviews')
    .upsert({
      user_id: form.user_id,
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
  await logVisit(form.user_id, form.restaurant_id).catch(() => {});

  return data as Review;
}

export async function deleteReview(reviewId: string): Promise<void> {
  const { error } = await supabase.from('reviews').delete().eq('id', reviewId);
  if (error) throw error;
}

/** Delete the current user's review for a restaurant (used by the rated-check). */
export async function deleteReviewForRestaurant(userId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('reviews')
    .delete()
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
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
