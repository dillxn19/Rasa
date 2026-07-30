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
  topCategories: { key: string; count: number }[];
  topArea: string | null;
  cities: string[];
  cuisinesTried: number;
  fiveStarCount: number;
  bestDayCount: number;   // most reviews logged in a single day
  photos: string[];
  coinsEarned: number;
  isEmpty: boolean;
}

/**
 * The recap is only viewable in a window: the **last week of the recapped month
 * through the first week of the next month**. Outside that window it's "not ready
 * yet". During the first week of a month, the recap shown is the PREVIOUS month's.
 * Returns whether the window is open + which month to recap.
 */
export function getRecapWindow(now: Date = new Date()): {
  open: boolean;
  monthDate: Date;
  monthLabel: string;
} {
  const day = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();

  let open = false;
  let monthDate = new Date(now.getFullYear(), now.getMonth(), 1);
  if (day >= daysInMonth - 2) {
    // Last 3 days of the month → this month's recap.
    open = true;
  } else if (day <= 7) {
    // First 7 days of the month → last month's recap.
    open = true;
    monthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  }
  return { open, monthDate, monthLabel: monthDate.toLocaleString('en-US', { month: 'long' }) };
}

/**
 * Aggregates a calendar month's review activity into a shareable "Rasa Wrapped"
 * recap. Defaults to the current month; pass `monthDate` to recap a specific one.
 * All computation is client-side over a single month's reviews (small set).
 */
export async function getMonthlyRecap(userId: string, monthDate: Date = new Date()): Promise<RecapData> {
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString();
  const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1).toISOString();
  const monthLabel = monthDate.toLocaleString('en-US', { month: 'long' });
  const year = monthDate.getFullYear();

  const [{ data: reviews }, { data: coinRows }] = await Promise.all([
    supabase
      .from('reviews')
      .select(
        'rating, created_at, photos, restaurant:restaurants!restaurant_id(id,name,slug,cover_photo_url,category,city,area,cuisines)'
      )
      .eq('user_id', userId)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd)
      .order('rating', { ascending: false }),
    supabase
      .from('coin_transactions')
      .select('amount')
      .eq('user_id', userId)
      .gt('amount', 0)
      .gte('created_at', monthStart)
      .lt('created_at', monthEnd),
  ]);

  const rows = (reviews ?? []) as any[];
  const total = rows.length;

  if (total === 0) {
    return {
      monthLabel, year,
      totalReviews: 0, avgRating: null, photosShared: 0,
      topRestaurant: null, topRestaurants: [], topCategory: null, topCategories: [], topArea: null,
      cities: [], cuisinesTried: 0, fiveStarCount: 0, bestDayCount: 0,
      photos: [], coinsEarned: 0,
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

  // Most-reviewed categories + favourite area + cuisines + photos (collage) +
  // 5★ count + busiest single day.
  const catCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  const citySet = new Set<string>();
  const cuisineSet = new Set<string>();
  const dayCounts = new Map<string, number>();
  const photos: string[] = [];
  let fiveStarCount = 0;
  for (const r of rows) {
    const cat = r.restaurant?.category;
    if (cat) catCounts.set(cat, (catCounts.get(cat) ?? 0) + 1);
    const city = r.restaurant?.city;
    if (city) citySet.add(city);
    const area = r.restaurant?.area;
    if (area) areaCounts.set(area, (areaCounts.get(area) ?? 0) + 1);
    if (Array.isArray(r.restaurant?.cuisines)) r.restaurant.cuisines.forEach((c: string) => cuisineSet.add(c));
    if (Array.isArray(r.photos)) photos.push(...r.photos);
    if ((r.rating ?? 0) >= 5) fiveStarCount += 1;
    const day = (r.created_at ?? '').slice(0, 10);
    if (day) dayCounts.set(day, (dayCounts.get(day) ?? 0) + 1);
  }

  const topCategories = [...catCounts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count);
  const topCategory = topCategories[0] ?? null;

  let topArea: string | null = null;
  let topAreaCount = 0;
  for (const [area, count] of areaCounts) {
    if (count > topAreaCount) { topArea = area; topAreaCount = count; }
  }
  const bestDayCount = Math.max(0, ...dayCounts.values());

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
    topCategories,
    topArea,
    cities: Array.from(citySet),
    cuisinesTried: cuisineSet.size,
    fiveStarCount,
    bestDayCount,
    photos,
    coinsEarned,
    isEmpty: false,
  };
}
