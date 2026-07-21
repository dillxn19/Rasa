import { supabase } from '@/lib/supabase';

export interface RecapTopRestaurant {
  id: string;
  name: string;
  slug: string | null;
  cover_photo_url: string | null;
  city: string | null;
  category: string | null;
  rating: number;
}

export interface RecapData {
  monthLabel: string; // e.g. "July"
  year: number;
  totalReviews: number;
  avgRating: number | null;
  photosShared: number;
  topRestaurant: RecapTopRestaurant | null;
  topCategory: { key: string; count: number } | null;
  cities: string[];
  coinsEarned: number;
  isEmpty: boolean;
}

/**
 * Aggregates the current calendar month's review activity into a shareable
 * "Rasa Wrapped" recap. All computation is client-side over a single month's
 * reviews (small set), so no dedicated SQL view is needed.
 */
export async function getMonthlyRecap(userId: string): Promise<RecapData> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
  const monthLabel = now.toLocaleString('en-US', { month: 'long' });
  const year = now.getFullYear();

  const [{ data: reviews }, { data: coinRows }] = await Promise.all([
    supabase
      .from('reviews')
      .select(
        'rating, created_at, photos, restaurant:restaurants!restaurant_id(id,name,slug,cover_photo_url,category,city)'
      )
      .eq('user_id', userId)
      .gte('created_at', monthStart)
      .order('rating', { ascending: false }),
    supabase
      .from('coin_transactions')
      .select('amount')
      .eq('user_id', userId)
      .gt('amount', 0)
      .gte('created_at', monthStart),
  ]);

  const rows = (reviews ?? []) as any[];
  const total = rows.length;

  if (total === 0) {
    return {
      monthLabel, year,
      totalReviews: 0, avgRating: null, photosShared: 0,
      topRestaurant: null, topCategory: null, cities: [], coinsEarned: 0,
      isEmpty: true,
    };
  }

  const avgRating =
    rows.reduce((sum, r) => sum + (r.rating ?? 0), 0) / total;

  const photosShared = rows.reduce(
    (sum, r) => sum + (Array.isArray(r.photos) ? r.photos.length : 0),
    0
  );

  // Highest-rated place this month (rows already ordered by rating desc).
  const topRow = rows.find(r => r.restaurant) ?? rows[0];
  const tr = topRow?.restaurant;
  const topRestaurant: RecapTopRestaurant | null = tr
    ? {
        id: tr.id,
        name: tr.name,
        slug: tr.slug ?? null,
        cover_photo_url: tr.cover_photo_url ?? null,
        city: tr.city ?? null,
        category: tr.category ?? null,
        rating: topRow.rating ?? 0,
      }
    : null;

  // Most-reviewed category.
  const catCounts = new Map<string, number>();
  const citySet = new Set<string>();
  for (const r of rows) {
    const cat = r.restaurant?.category;
    if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    const city = r.restaurant?.city;
    if (city) citySet.add(city);
  }
  let topCategory: { key: string; count: number } | null = null;
  for (const [key, count] of catCounts) {
    if (!topCategory || count > topCategory.count) topCategory = { key, count };
  }

  const coinsEarned = (coinRows ?? []).reduce(
    (sum: number, r: any) => sum + (r.amount ?? 0),
    0
  );

  return {
    monthLabel, year,
    totalReviews: total,
    avgRating,
    photosShared,
    topRestaurant,
    topCategory,
    cities: Array.from(citySet),
    coinsEarned,
    isEmpty: false,
  };
}
