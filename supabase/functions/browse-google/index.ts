// On-demand category/dish browse from Google Places — fills gaps when the Rasa DB
// is sparse (early stages). Does ONE Text Search for the category/dish in a city,
// upserts real rows (deduped by google_place_id, conservative halal inference),
// and returns the full rows so Explore renders them as normal RestaurantCards.
// Deploy with --no-verify-jwt (called with the anon key from the app).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import {
  mapCategory, mapCuisines, mapPriceRange, priceLevelToInt, extractLocation, slugify, mapDietary,
} from '../_shared/places.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_KEY')!;
const TEXT_SEARCH = 'https://places.googleapis.com/v1/places:searchText';
const FIELD_MASK = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.location',
  'places.primaryType', 'places.types', 'places.priceLevel', 'places.rating',
  'places.userRatingCount', 'places.addressComponents', 'places.photos',
  'places.nationalPhoneNumber', 'places.websiteUri', 'places.googleMapsUri', 'places.editorialSummary',
].join(',');

// Rasa category key → a Google-friendly search term.
const CATEGORY_TERM: Record<string, string> = {
  hawker: 'hawker food', mamak: 'mamak', cafe: 'cafe', kopitiam: 'kopitiam',
  fine_dining: 'fine dining restaurant', food_court: 'food court',
  night_market: 'night market food', restaurant: 'restaurant',
  fast_food: 'fast food', bar: 'bar', buffet: 'buffet restaurant', food_truck: 'food truck',
};

async function photoUrl(name: string | undefined): Promise<string | null> {
  if (!name) return null;
  try {
    const u = new URL(`https://places.googleapis.com/v1/${name}/media`);
    u.searchParams.set('maxWidthPx', '1000');
    u.searchParams.set('skipHttpRedirect', 'true');
    const r = await fetch(u.toString(), { headers: { 'X-Goog-Api-Key': GOOGLE_KEY } });
    if (!r.ok) return null;
    return (await r.json()).photoUri ?? null;
  } catch { return null; }
}

async function pool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0;
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]); }
  }));
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { category, dish, city, lat, lng } = await req.json();
    const cityName = String(city ?? 'Kuala Lumpur').trim();
    const term = dish
      ? String(dish).trim()
      : CATEGORY_TERM[String(category ?? '')] ?? String(category ?? 'restaurant');
    const textQuery = `best ${term} in ${cityName}`;

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const body: Record<string, unknown> = {
      textQuery, includedType: 'restaurant', regionCode: 'MY', pageSize: 20,
    };
    if (typeof lat === 'number' && typeof lng === 'number') {
      body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 15000 } };
    }

    const res = await fetch(TEXT_SEARCH, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': FIELD_MASK },
      body: JSON.stringify(body),
    });
    if (!res.ok) return json({ error: 'search_failed', rows: [] }, 502);

    const places: any[] = (await res.json()).places ?? [];
    const seen = new Set<string>();
    const unique = places.filter((p) => p?.id && !seen.has(p.id) && seen.add(p.id));

    await pool(unique, 8, async (p) => {
      const placeId = p.id;
      const { data: existing } = await supabase
        .from('restaurants').select('id, cover_photo_url').eq('google_place_id', placeId).maybeSingle();

      const name = p.displayName?.text ?? 'Unknown';
      const loc = extractLocation(p.addressComponents ?? []);
      const cat = mapCategory(p.primaryType, p.types, name);
      const cover = existing?.cover_photo_url ?? await photoUrl(p.photos?.[0]?.name);

      const row: Record<string, unknown> = {
        name, slug: slugify(name, placeId),
        description: p.editorialSummary?.text ?? null,
        category: cat,
        cuisines: mapCuisines(p.primaryType, p.types),
        dietary_options: mapDietary(name, cat, p.editorialSummary?.text ?? '', p.types ?? []),
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
        // Do NOT set overall_rating from Google — real reviews only (trust model).
        source: 'google', is_approved: true, is_active: true,
        last_synced_at: new Date().toISOString(),
      };

      if (existing) await supabase.from('restaurants').update(row).eq('id', existing.id);
      else await supabase.from('restaurants').insert(row);
    });

    // Return the full rows for this city+category so Explore renders normal cards.
    const ids = unique.map((p) => p.id);
    const { data: rows } = ids.length
      ? await supabase.from('restaurants').select('*').in('google_place_id', ids)
      : { data: [] };

    return json({ count: (rows ?? []).length, rows: rows ?? [] });
  } catch (err) {
    return json({ error: String(err), rows: [] }, 400);
  }
});
