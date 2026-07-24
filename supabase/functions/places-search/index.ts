// Beli-style hybrid search: Rasa's own restaurants first (social data), then
// Google Places Autocomplete for everything else. Google's key stays server-side.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_KEY')!;
const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { query, lat, lng, sessionToken } = await req.json();
    if (!query || String(query).trim().length < 2) {
      return json({ rasa: [], google: [] });
    }
    const q = String(query).trim();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // 1. Rasa-first: places already in our DB (carry their social data).
    const { data: rasaRows } = await supabase
      .from('restaurants')
      .select('id, name, slug, area, city, category, cover_photo_url, overall_rating, total_reviews, price_range, google_place_id')
      .eq('is_approved', true)
      .eq('is_active', true)
      .ilike('name', `%${q}%`)
      .order('total_reviews', { ascending: false })
      .limit(6);

    const rasa = rasaRows ?? [];
    const knownPlaceIds = new Set(rasa.map((r) => r.google_place_id).filter(Boolean));

    // 2. Google Autocomplete for the long tail (chains → distinct branches).
    const body: Record<string, unknown> = {
      input: q,
      sessionToken,
      includedRegionCodes: ['my'],
      includedPrimaryTypes: ['restaurant', 'cafe', 'bar', 'bakery', 'food'],
    };
    if (typeof lat === 'number' && typeof lng === 'number') {
      body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 50000 } };
    }

    let google: Array<{ placeId: string; name: string; secondary: string }> = [];
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
      },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      google = (data.suggestions ?? [])
        .map((s: any) => s.placePrediction)
        .filter(Boolean)
        .map((p: any) => ({
          placeId: p.placeId,
          name: p.structuredFormat?.mainText?.text ?? p.text?.text ?? '',
          secondary: p.structuredFormat?.secondaryText?.text ?? '',
        }))
        // Don't show a Google result we already have as a richer Rasa result.
        .filter((p: any) => p.placeId && !knownPlaceIds.has(p.placeId));
    } else {
      console.error('[places-search] autocomplete failed', res.status, await res.text());
    }

    return json({ rasa, google });
  } catch (e) {
    console.error('[places-search]', e);
    return json({ error: 'search_failed', rasa: [], google: [] }, 500);
  }
});
