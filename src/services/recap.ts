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
  topRestaurants: RecapTopRestaurant[];
  topCategory: { key: string; count: number } | null;
  topArea: string | null;
  cities: string[];
  photos: string[];
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
        'rating, created_at, photos, restaurant:restaurants!restaurant_id(id,name,slug,cover_photo_url,category,city,area)'
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
      topRestaurant: null, topRestaurants: [], topCategory: null, topArea: null,
      cities: [], photos: [], coinsEarned: 0,
      isEmpty: true,
    };
  }

  const avgRating =
    rows.reduce((sum, r) => sum + (r.rating ?? 0), 0) / total;

  const photosShared = rows.reduce(
    (sum, r) => sum + (Array.isArray(r.photos) ? r.photos.length : 0),
    0
  );

  // Top places this month (rows already ordered by rating desc). Dedupe by
  // restaurant so a repeat visit doesn't take two slots.
  const seenTop = new Set<string>();
  const topRestaurants: RecapTopRestaurant[] = [];
  for (const row of rows) {
    const tr = row.restaurant;
    if (!tr || seenTop.has(tr.id)) continue;
    seenTop.add(tr.id);
    topRestaurants.push({
      id: tr.id,
      name: tr.name,
      slug: tr.slug ?? null,
      cover_photo_url: tr.cover_photo_url ?? null,
      city: tr.city ?? null,
      category: tr.category ?? null,
      rating: row.rating ?? 0,
    });
    if (topRestaurants.length >= 5) break;
  }
  const topRestaurant = topRestaurants[0] ?? null;

  // Most-reviewed category + favourite area + all photos (for the collage).
  const catCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  const citySet = new Set<string>();
  const photos: string[] = [];
  for (const r of rows) {
    const cat = r.restaurant?.category;
    if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    const city = r.restaurant?.city;
    if (city) citySet.add(city);
    const area = r.restaurant?.area;
    if (area) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    if (Array.isArray(r.photos)) photos.push(...r.photos);
  }
  let topCategory: { key: string; count: number } | null = null;
  for (const [key, count] of catCounts) {
    if (!topCategory || count > topCategory.count) topCategory = { key, count };
  }
  let topArea: string | null = null;
  let topAreaCount = 0;
  for (const [area, count] of areaCounts) {
    if (count > topAreaCount) { topArea = area; topAreaCount = count; }
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
    topRestaurants,
    topCategory,
    topArea,
    cities: Array.from(citySet),
    photos,
    coinsEarned,
    isEmpty: false,
  };
}
