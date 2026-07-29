// Resolve a Google place_id → a canonical Rasa restaurant row (get-or-create).
// This is what guarantees one row per real location: identity comes from Google,
// so no dupes and no misspellings. Runs with the service role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/cors.ts';
import {
  mapCategory, mapCuisines, mapPriceRange, priceLevelToInt, extractLocation, slugify, mapDietary,
} from '../_shared/places.ts';

const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_KEY')!;
const FIELD_MASK = [
  'id', 'displayName', 'formattedAddress', 'location', 'primaryType', 'types',
  'priceLevel', 'rating', 'userRatingCount', 'addressComponents',
  'nationalPhoneNumber', 'websiteUri', 'googleMapsUri', 'photos', 'editorialSummary',
].join(',');

// Refresh cached Google fields if older than this (Google ToS: cache short-term).
const STALE_MS = 30 * 24 * 60 * 60 * 1000;

// Resolve a Google photo resource name → a hosted image URL, ONCE at resolve
// time (not per view) so we pay a single Places Photo request per place, not
// one per card render. The returned googleusercontent URL is CDN-served for free
// and refreshed on the 30-day re-sync.
async function fetchPhotoUrl(photoName: string): Promise<string | null> {
  try {
    const u = new URL(`https://places.googleapis.com/v1/${photoName}/media`);
    u.searchParams.set('maxWidthPx', '1000');
    u.searchParams.set('skipHttpRedirect', 'true');
    const r = await fetch(u.toString(), { headers: { 'X-Goog-Api-Key': GOOGLE_KEY } });
    if (!r.ok) return null;
    const data = await r.json();
    return data.photoUri ?? null;
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { placeId, sessionToken, nameHint } = await req.json();
    if (!placeId) return json({ error: 'placeId required' }, 400);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Already have this location? Return it (unless the cache is stale).
    const { data: existing } = await supabase
      .from('restaurants')
      .select('*')
      .eq('google_place_id', placeId)
      .maybeSingle();

    const fresh =
      existing?.last_synced_at &&
      Date.now() - new Date(existing.last_synced_at).getTime() < STALE_MS;
    if (existing && fresh) return json({ restaurant: existing });

    // Fetch Place Details (closes the Autocomplete billing session via sessionToken).
    const url = new URL(`https://places.googleapis.com/v1/places/${placeId}`);
    if (sessionToken) url.searchParams.set('sessionToken', sessionToken);
    const res = await fetch(url.toString(), {
      headers: { 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': FIELD_MASK },
    });
    if (!res.ok) {
      console.error('[places-resolve] details failed', res.status, await res.text());
      // Fall back to the stale row if we have one.
      if (existing) return json({ restaurant: existing });
      return json({ error: 'details_failed' }, 502);
    }
    const p = await res.json();

    // Prefer the branch label the user actually tapped in Autocomplete
    // (e.g. "Starbucks Pavilion Connection") over Google's generic canonical
    // displayName ("Starbucks Coffee") so chains stay distinguishable like Beli.
    const displayName = p.displayName?.text ?? 'Unknown';
    const name =
      (typeof nameHint === 'string' && nameHint.trim()) ||
      existing?.name ||
      displayName;
    const loc = extractLocation(p.addressComponents ?? []);

    // Pull a real cover photo from Google (once) so google-sourced places don't
    // show a blank/placeholder. Keep an existing cover if we already have one.
    let coverUrl: string | null = existing?.cover_photo_url ?? null;
    const firstPhoto = p.photos?.[0]?.name;
    if (!coverUrl && firstPhoto) {
      coverUrl = await fetchPhotoUrl(firstPhoto);
    }

    const row: Record<string, unknown> = {
      name,
      slug: existing?.slug ?? slugify(name, placeId),
      description: p.editorialSummary?.text ?? existing?.description ?? null,
      category: mapCategory(p.primaryType, p.types, name),
      cuisines: mapCuisines(p.primaryType, p.types),
      // Trust-critical: conservative halal inference — never "halal_certified" from
      // Google. Recomputed on each sync so improvements propagate to google rows.
      dietary_options: mapDietary(
        name, mapCategory(p.primaryType, p.types, name), p.editorialSummary?.text ?? '', p.types ?? [],
      ),
      price_range: mapPriceRange(p.priceLevel) ?? existing?.price_range ?? '$$',
      price_level: priceLevelToInt(p.priceLevel),
      address: p.formattedAddress ?? '',
      area: loc.area,
      city: loc.city,
      state: loc.state,
      country: loc.country,
      postal_code: loc.postal,
      latitude: p.location?.latitude ?? null,
      longitude: p.location?.longitude ?? null,
      phone_number: p.nationalPhoneNumber ?? null,
      website_url: p.websiteUri ?? null,
      google_maps_url: p.googleMapsUri ?? null,
      cover_photo_url: coverUrl,
      google_place_id: placeId,
      google_types: p.types ?? [],
      google_rating: p.rating ?? null,
      google_rating_count: p.userRatingCount ?? null,
      source: 'google',
      is_approved: true,
      is_active: true,
      last_synced_at: new Date().toISOString(),
    };

    // Update the existing (stale) row, otherwise insert. We avoid ON CONFLICT
    // because google_place_id is a PARTIAL unique index (WHERE NOT NULL), which
    // a bare upsert conflict target won't match.
    if (existing) {
      const { data: updated, error } = await supabase
        .from('restaurants')
        .update(row)
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) {
        console.error('[places-resolve] update', error);
        return json({ restaurant: existing });
      }
      return json({ restaurant: updated });
    }

    const { data: saved, error } = await supabase
      .from('restaurants')
      .insert(row)
      .select('*')
      .single();
    if (error) {
      // Likely a race: another request just created it. Re-fetch by place_id.
      console.error('[places-resolve] insert', error);
      const { data: raced } = await supabase
        .from('restaurants')
        .select('*')
        .eq('google_place_id', placeId)
        .maybeSingle();
      if (raced) return json({ restaurant: raced });
      return json({ error: 'save_failed', detail: error.message }, 500);
    }

    return json({ restaurant: saved });
  } catch (e) {
    console.error('[places-resolve]', e);
    return json({ error: 'resolve_failed' }, 500);
  }
});
