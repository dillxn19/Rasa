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
  // Call the DB function to refresh + return recommendations
  const { data, error } = await supabase.rpc('generate_recommendations', {
    p_user_id: userId,
  });

  if (error) {
    console.error('[getRecommendations]', error);
    return [];
  }

  // Now fetch the top recommendations with restaurant data
  const { data: recs, error: recError } = await supabase
    .from('recommendations')
    .select(`
      *,
      restaurant:restaurants(*)
    `)
    .eq('user_id', userId)
    .eq('is_dismissed', false)
    .order('score', { ascending: false })
    .limit(limit);

  if (recError || !recs) return [];

  return recs
    .filter(r => r.restaurant)
    .map(r => ({
      restaurant: r.restaurant as Restaurant,
      score: r.score,
      reason: r.reason ?? 'recommended',
      reason_label: getReasonLabel(r.reason ?? 'recommended'),
      reason_data: r.reason_data,
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
  };
  return labels[reason] ?? '⭐ For you';
}
