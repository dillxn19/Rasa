import { supabase } from '@/lib/supabase';
import type { Restaurant } from '@/types';

export interface RecommendationResult {
  restaurant: Restaurant;
  score: number;
  reason: string;
  reason_label: string;
  reason_data: Record<string, unknown> | null;
}

export async function getRecommendations(
  userId: string,
  limit = 10
): Promise<RecommendationResult[]> {
  // Refresh the recommendations table. This RPC is best-effort — if it fails
  // (e.g. sparse taste graph) we still serve whatever's cached, then fall back.
  await supabase.rpc('generate_recommendations', { p_user_id: userId }).catch(() => {});

  const { data: recs } = await supabase
    .from('recommendations')
    .select(`*, restaurant:restaurants(*)`)
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .order('score', { ascending: false })
    .limit(limit);

  const mapped = (recs ?? [])
    .filter(r => r.restaurant)
    .map(r => ({
      restaurant: r.restaurant as Restaurant,
      score: r.score,
      reason: r.reason ?? 'recommended',
      reason_label: getReasonLabel(r.reason ?? 'recommended'),
      reason_data: r.reason_data,
    }));

  if (mapped.length > 0) return mapped;

  // Fallback so the screen is never empty/broken: top-rated places the user
  // hasn't reviewed, biased to their favourite cuisines when set.
  return getFallbackRecommendations(userId, limit);
}

async function getFallbackRecommendations(
  userId: string,
  limit: number,
): Promise<RecommendationResult[]> {
  const { data: me } = await supabase
    .from('users').select('favorite_cuisines, city').eq('id', userId).maybeSingle();

  const { data: reviewed } = await supabase
    .from('reviews').select('restaurant_id').eq('user_id', userId);
  const reviewedIds = new Set((reviewed ?? []).map((r: any) => r.restaurant_id));

  let q = supabase
    .from('restaurants')
    .select('*')
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('overall_rating', { ascending: false })
    .limit(limit + reviewedIds.size + 10);

  const cuisines = (me?.favorite_cuisines ?? []) as string[];
  if (cuisines.length > 0) q = q.overlaps('cuisines', cuisines);

  const { data: rows } = await q;
  return ((rows ?? []) as Restaurant[])
    .filter(r => !reviewedIds.has(r.id))
    .slice(0, limit)
    .map(r => ({
      restaurant: r,
      score: r.overall_rating ?? 0,
      reason: 'popular',
      reason_label: getReasonLabel('popular'),
      reason_data: null,
    }));
}

export async function dismissRecommendation(
  userId: string,
  restaurantId: string
): Promise<void> {
  await supabase
    .from('recommendations')
    .update({ is_dismissed: true })
    .eq('user_id', userId)
    .eq('restaurant_id', restaurantId);
}

export async function getTrendingNearby(
  city: string,
  limit = 8,
  halalOnly = false
): Promise<Restaurant[]> {
  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('city', city)
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('popularity_score', { ascending: false })
    .limit(limit);

  if (halalOnly) {
    query = query.contains('dietary_options', ['halal_certified']);
  }

  const { data } = await query;
  return (data ?? []) as Restaurant[];
}

export async function getNewlyAdded(
  city: string,
  limit = 6
): Promise<Restaurant[]> {
  const { data } = await supabase
    .from('restaurants')
    .select('*')
    .eq('city', city)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(limit);

  return (data ?? []) as Restaurant[];
}

function getReasonLabel(reason: string): string {
  const labels: Record<string, string> = {
    taste_match: '🎯 Matches your taste',
    friends_visited: '👥 Friends love this',
    trending: '🔥 Trending now',
    similar_cuisine: '🍜 Your cuisine',
    nearby: '📍 Near you',
    hidden_gem: '💎 Hidden gem',
    recommended: '⭐ For you',
    popular: '⭐ Highly rated',
  };
  return labels[reason] ?? '⭐ For you';
}
