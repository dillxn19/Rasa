// One-off admin task: give the seeded restaurants (Unsplash placeholders) real
// Google cover photos, updating the EXISTING rows in place (no new rows, so no
// duplicates). For each seed/placeholder restaurant it does a Google Text Search
// by "name, area city", grabs the first photo, and stores its CDN URL.
// Invoke once with the service-role key:
//   curl -X POST '<url>/functions/v1/backfill-covers' -H "Authorization: Bearer <SERVICE_ROLE_KEY>"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_KEY')!;
const TEXT_SEARCH = 'https://places.googleapis.com/v1/places:searchText';

async function findPlace(query: string): Promise<{ cover: string | null; description: string | null }> {
  const empty = { cover: null, description: null };
  try {
    const res = await fetch(TEXT_SEARCH, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'places.id,places.photos,places.editorialSummary',
      },
      body: JSON.stringify({ textQuery: query, includedType: 'restaurant', regionCode: 'MY' }),
    });
    if (!res.ok) return empty;
    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return empty;

    const description = place.editorialSummary?.text ?? null;
    const photoName = place.photos?.[0]?.name;
    let cover: string | null = null;
    if (photoName) {
      const u = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
      u.searchParams.set('maxWidthPx', '1000');
      u.searchParams.set('skipHttpRedirect', 'true');
      const r = await fetch(u.toString(), { headers: { 'X-Goog-Api-Key': GOOGLE_KEY } });
      if (r.ok) cover = (await r.json()).photoUri ?? null;
    }
    return { cover, description };
  } catch {
    return empty;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Seeded or placeholder-cover restaurants that aren't Google-sourced.
  const { data: rows } = await supabase
    .from('restaurants')
    .select('id, name, area, city, cover_photo_url, source')
    .or('source.eq.seed,cover_photo_url.ilike.%unsplash%,cover_photo_url.is.null');

  const results = await Promise.all((rows ?? []).map(async (r: any) => {
    const query = [r.name, r.area, r.city].filter(Boolean).join(', ');
    const { cover, description } = await findPlace(query);
    const patch: Record<string, unknown> = {};
    if (cover) patch.cover_photo_url = cover;
    if (description) patch.description = description;
    if (Object.keys(patch).length > 0) {
      await supabase.from('restaurants').update(patch).eq('id', r.id);
      return { name: r.name, ok: true };
    }
    return { name: r.name, ok: false };
  }));

  const updated = results.filter(x => x.ok).length;
  return json({ scanned: rows?.length ?? 0, updated, results });
});
