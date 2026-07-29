import { supabase } from '@/lib/supabase';
import { HALAL_DIETARY_TAGS } from '@/lib/halal';
import { bayesianScore } from '@/lib/ranking';
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
  try {
    // Refresh the recommendations table. This RPC is best-effort — if it fails
    // (e.g. sparse taste graph) we still serve whatever's cached, then fall back.
    await supabase.rpc('generate_recommendations', { p_user_id: userId }).catch(() => {});

    // The places the user has already reviewed — never recommend these.
    const { data: reviewed } = await supabase
      .from('reviews').select('restaurant_id').eq('user_id', userId);
    const reviewedIds = new Set((reviewed ?? []).map((r: any) => r.restaurant_id));

    const { data: recs } = await supabase
      .from('recommendations')
      .select(`*, restaurant:restaurants(*)`)
      .eq('user_id', userId)
      .eq('is_dismissed', false)
      .order('score', { ascending: false })
      .limit(limit * 2);

    // Filter out reviewed places HERE (the old bug: the engine could return only
    // already-reviewed spots, which the screen then filtered to empty → "no picks").
    const mapped = (recs ?? [])
      .filter(r => r.restaurant && !reviewedIds.has((r.restaurant as Restaurant).id))
      .map(r => ({
        restaurant: r.restaurant as Restaurant,
        score: r.score,
        reason: r.reason ?? 'recommended',
        reason_label: getReasonLabel(r.reason ?? 'recommended'),
        reason_data: r.reason_data,
      }));

    if (mapped.length >= limit) return mapped.slice(0, limit);

    // Top up with the fallback (top-rated unreviewed places, biased to favourite
    // cuisines) so the screen is ALWAYS full, never empty.
    const fallback = await getFallbackRecommendations(userId, limit, reviewedIds);
    const seen = new Set(mapped.map(m => m.restaurant.id));
    for (const f of fallback) {
      if (mapped.length >= limit) break;
      if (!seen.has(f.restaurant.id)) { seen.add(f.restaurant.id); mapped.push(f); }
    }
    return mapped;
  } catch {
    // Absolute last resort — still try the fallback so taste match works.
    return getFallbackRecommendations(userId, limit).catch(() => []);
  }
}

async function getFallbackRecommendations(
  userId: string,
  limit: number,
  reviewedIdsIn?: Set<string>,
): Promise<RecommendationResult[]> {
  const { data: me } = await supabase
    .from('users').select('favorite_cuisines, city').eq('id', userId).maybeSingle();

  let reviewedIds: Set<string>;
  if (reviewedIdsIn) {
    reviewedIds = reviewedIdsIn;
  } else {
    const { data: reviewed } = await supabase
      .from('reviews').select('restaurant_id').eq('user_id', userId);
    reviewedIds = new Set((reviewed ?? []).map((r: any) => r.restaurant_id));
  }
  const cuisines = (me?.favorite_cuisines ?? []) as string[];

  // Base pool: top places the user hasn't been to. Rank by Google rating too so
  // a cold-start DB (few Rasa reviews) still surfaces genuinely good spots.
  const fetchPool = async (cuisineFilter: boolean): Promise<Restaurant[]> => {
    let q = supabase
      .from('restaurants')
      .select('*')
      .eq('is_approved', true)
      .eq('is_active', true)
      .order('overall_rating', { ascending: false })
      .order('google_rating', { ascending: false, nullsFirst: false })
      .order('total_reviews', { ascending: false })
      .limit(limit + reviewedIds.size + 20);
    if (cuisineFilter && cuisines.length > 0) q = q.overlaps('cuisines', cuisines);
    const { data } = await q;
    return ((data ?? []) as Restaurant[]).filter(r => !reviewedIds.has(r.id));
  };

  // Prefer favourite-cuisine matches, but DON'T return empty when there are none
  // (the old bug): fall back to the top unreviewed places overall.
  const rows = cuisines.length > 0 ? await fetchPool(true) : [];
  if (rows.length < limit) {
    const seen = new Set(rows.map(r => r.id));
    for (const r of await fetchPool(false)) {
      if (rows.length >= limit) break;
      if (!seen.has(r.id)) { seen.add(r.id); rows.push(r); }
    }
  }

  const now = Date.now();
  // Vary the reason per place so the feed isn't a wall of identical "Highly rated"
  // tags: cuisine match → your-cuisine; genuinely high rating+volume → highly rated;
  // recently added → new; everything else → a neutral "for you".
  const pickReason = (r: Restaurant, matched: boolean): string => {
    if (matched) return 'similar_cuisine';
    const volume = (r.total_reviews ?? 0) + (r.google_rating_count ?? 0);
    const rating = r.overall_rating || r.google_rating || 0;
    if (rating >= 4.3 && volume >= 30) return 'popular';
    if (r.created_at && now - new Date(r.created_at).getTime() < 1000 * 60 * 60 * 24 * 45) return 'new';
    return 'recommended';
  };

  return rows.slice(0, limit).map((r) => {
    const matched = cuisines.length > 0 && (r.cuisines ?? []).some(c => cuisines.includes(c));
    const reason = pickReason(r, matched);
    return {
      restaurant: r,
      score: r.overall_rating ?? r.google_rating ?? 0,
      reason,
      reason_label: getReasonLabel(reason),
      reason_data: null,
    };
  });
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
  // Pull a broader popular pool, then rank by the SAME Bayesian weighted score
  // as Explore's "Top Rated" (high rating + enough reviews), so trending reflects
  // genuine quality — not just raw popularity or a lucky 5★ from 2 people.
  let query = supabase
    .from('restaurants')
    .select('*')
    .eq('city', city)
    .eq('is_approved', true)
    .eq('is_active', true)
    .order('popularity_score', { ascending: false })
    .limit(Math.max(limit * 4, 40));

  if (halalOnly) {
    query = query.overlaps('dietary_options', HALAL_DIETARY_TAGS as unknown as string[]);
  }

  const { data } = await query;
  return ((data ?? []) as Restaurant[])
    .sort((a, b) => bayesianScore(b) - bayesianScore(a))
    .slice(0, limit);
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
    new: '🆕 New here',
  };
  return labels[reason] ?? '⭐ For you';
}
