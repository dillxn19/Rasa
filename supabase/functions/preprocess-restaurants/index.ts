// One-off pre-launch seeding: pull ~100 real, popular Klang Valley restaurants
// from Google Places Text Search and cache them as canonical Rasa rows (with
// real cover photos), deduped by google_place_id. This kills cold-start — Nearby,
// Recommendations, search and the feed all have real content on day one.
//
// Deploy, then invoke once with the service-role key:
//   curl -X POST '<url>/functions/v1/preprocess-restaurants' -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import {
  mapCategory, mapCuisines, mapPriceRange, priceLevelToInt, extractLocation, slugify,
} from '../_shared/places.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_KEY')!;
const TEXT_SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.primaryType', 'places.types', 'places.priceLevel', 'places.rating',
  'places.userRatingCount', 'places.addressComponents', 'places.photos',
  'places.nationalPhoneNumber', 'places.websiteUri', 'places.googleMapsUri',
  'places.editorialSummary',
].join(',');

// Broad queries across Klang Valley areas + iconic cuisines → good coverage.
const QUERIES = [
  // Built to cover every browse entry point (each category + popular dish) across
  // the Klang Valley, so category/dish browse is never sparse. Deduped by place_id.
  ...(() => {
    const areas = ['Kuala Lumpur', 'Petaling Jaya', 'Subang Jaya'];
    const categories = [
      'mamak', 'kopitiam', 'cafe', 'hawker centre', 'fine dining restaurant',
      'chinese restaurant', 'indian restaurant', 'malay restaurant', 'japanese restaurant',
      'korean restaurant', 'western restaurant', 'seafood restaurant', 'nasi kandar',
      'dessert cafe', 'bakery',
    ];
    const dishes = [
      'nasi lemak', 'char kway teow', 'roti canai', 'bak kut teh', 'dim sum',
      'laksa', 'satay', 'chicken rice', 'wan tan mee', 'cendol',
      'burger', 'pizza', 'ramen', 'sushi', 'korean bbq', 'fried chicken', 'brunch', 'bingsu',
    ];
    const q: string[] = [];
    for (const c of categories) for (const a of areas) q.push(`best ${c} in ${a}`); // 45
    for (const d of dishes) q.push(`best ${d} in Kuala Lumpur`);                     // 18
    return q;
  })(),
];

// Bounded-concurrency map so we don't burst hundreds of calls at once.
async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) {
      const idx = i++;
      await fn(items[idx]);
    }
  });
  await Promise.all(workers);
}

async function photoUrl(photoName: string | undefined): Promise<string | null> {
  if (!photoName) return null;
  try {
    const u = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    u.searchParams.set('maxWidthPx', '1000');
    u.searchParams.set('skipHttpRedirect', 'true');
    const r = await fetch(u.toString(), { headers: { 'X-Goog-Api-Key': GOOGLE_KEY } });
    if (!r.ok) return null;
    return (await r.json()).photoUri ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const seen = new Set<string>();
  const counters = { created: 0, updated: 0 };

  async function processPlace(p: any) {
    const placeId = p.id; // already deduped by the caller
    const { data: existing } = await supabase
      .from('restaurants').select('id, cover_photo_url').eq('google_place_id', placeId).maybeSingle();

    const name = p.displayName?.text ?? 'Unknown';
    const loc = extractLocation(p.addressComponents ?? []);
    const cover = existing?.cover_photo_url ?? await photoUrl(p.photos?.[0]?.name);

    const row: Record<string, unknown> = {
      name,
      slug: slugify(name, placeId),
      description: p.editorialSummary?.text ?? null,
      category: mapCategory(p.primaryType, p.types, name),
      cuisines: mapCuisines(p.primaryType, p.types),
      price_range: mapPriceRange(p.priceLevel) ?? '$$',
      price_level: priceLevelToInt(p.priceLevel),
      address: p.formattedAddress ?? '',
      area: loc.area, city: loc.city, state: loc.state, country: loc.country, postal_code: loc.postal,
      latitude: p.location?.latitude ?? null,
      longitude: p.location?.longitude ?? null,
      phone_number: p.nationalPhoneNumber ?? null,
      website_url: p.websiteUri ?? null,
      google_maps_url: p.googleMapsUri ?? null,
      cover_photo_url: cover,
      google_place_id: placeId,
      google_types: p.types ?? [],
      google_rating: p.rating ?? null,
      google_rating_count: p.userRatingCount ?? null,
      overall_rating: p.rating ?? 0,
      source: 'google',
      is_approved: true,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    };

    if (existing) {
      await supabase.from('restaurants').update(row).eq('id', existing.id);
      counters.updated++;
    } else {
      const { error } = await supabase.from('restaurants').insert(row);
      if (!error) counters.created++;
    }
  }

  // 1) Text Searches — bounded concurrency (8 at a time) to respect Google QPS.
  const allPlaces: any[] = [];
  await pool(QUERIES, 8, async (q) => {
    const res = await fetch(TEXT_SEARCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify({ textQuery: q, includedType: 'restaurant', regionCode: 'MY', pageSize: 20 }),
    });
    if (res.ok) allPlaces.push(...((await res.json()).places ?? []));
  });

  // 2) Dedup by place_id up front, then upsert with bounded concurrency (10).
  const uniquePlaces = allPlaces.filter((p) => {
    if (!p?.id || seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });
  await pool(uniquePlaces, 10, processPlace);

  return json({ queries: QUERIES.length, unique: uniquePlaces.length, created: counters.created, updated: counters.updated });
});
