import { supabase } from '@/lib/supabase';
import type { AlgoliaRestaurant } from '@/types';

// ─── Google Places session tokens ─────────────────────────────────────────────
// Google bills an Autocomplete "session" (all keystrokes + one Details call) as a
// single unit when they share a session token. We start a token when a search
// begins and retire it once the user resolves a place (or abandons the search).
function makeToken(): string {
  // RN-safe UUID-ish token (Hermes may lack crypto.randomUUID).
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

let currentToken: string | null = null;
export function startPlacesSession(): string {
  currentToken = makeToken();
  return currentToken;
}
export function getPlacesSession(): string {
  return currentToken ?? startPlacesSession();
}
export function endPlacesSession(): void {
  currentToken = null;
}

// ─── Result shapes ────────────────────────────────────────────────────────────
export interface RasaHit {
  id: string;
  name: string;
  slug: string;
  area: string | null;
  city: string;
  category: string;
  cover_photo_url: string | null;
  overall_rating: number;
  total_reviews: number;
  price_range: string | null;
  google_place_id: string | null;
}
export interface GoogleHit {
  placeId: string;
  name: string;
  secondary: string;
}
export interface PlacesSearchResult {
  rasa: RasaHit[];
  google: GoogleHit[];
}

/**
 * Hybrid search: Rasa's own restaurants first (with social data), then Google
 * Places Autocomplete for everything else. Google's key never touches the client.
 */
export async function searchPlaces(
  query: string,
  opts: { lat?: number; lng?: number } = {},
): Promise<PlacesSearchResult> {
  const { data, error } = await supabase.functions.invoke('places-search', {
    body: { query, lat: opts.lat, lng: opts.lng, sessionToken: getPlacesSession() },
  });
  if (error) {
    console.error('[searchPlaces]', error);
    return { rasa: [], google: [] };
  }
  return (data as PlacesSearchResult) ?? { rasa: [], google: [] };
}

/**
 * Turn a Google place_id into a canonical Rasa restaurant row (get-or-create).
 * Ends the billing session. Returns an AlgoliaRestaurant-shaped object so the
 * review flow can consume it exactly like a search hit.
 */
export async function resolvePlace(
  placeId: string,
  nameHint?: string,
): Promise<AlgoliaRestaurant | null> {
  const token = getPlacesSession();
  const { data, error } = await supabase.functions.invoke('places-resolve', {
    body: { placeId, sessionToken: token, nameHint },
  });
  endPlacesSession(); // one resolve == end of a search session
  if (error || !data?.restaurant) {
    console.error('[resolvePlace]', error);
    return null;
  }
  return rowToAlgolia(data.restaurant);
}

/** A resolved Rasa restaurant hit already carries an id — adapt it too. */
export function rasaHitToAlgolia(h: RasaHit): AlgoliaRestaurant {
  return {
    objectID: h.id,
    name: h.name,
    slug: h.slug,
    category: h.category as AlgoliaRestaurant['category'],
    cuisines: [],
    city: h.city,
    area: h.area ?? '',
    address: '',
    overall_rating: h.overall_rating ?? 0,
    total_reviews: h.total_reviews ?? 0,
    cover_photo_url: h.cover_photo_url ?? '',
    price_range: (h.price_range ?? '') as AlgoliaRestaurant['price_range'],
    dietary_options: [],
    tags: [],
  };
}

function rowToAlgolia(r: any): AlgoliaRestaurant {
  return {
    objectID: r.id,
    name: r.name,
    slug: r.slug ?? '',
    category: (r.category ?? 'restaurant') as AlgoliaRestaurant['category'],
    cuisines: r.cuisines ?? [],
    city: r.city ?? '',
    area: r.area ?? '',
    address: r.address ?? '',
    overall_rating: r.overall_rating ?? 0,
    total_reviews: r.total_reviews ?? 0,
    cover_photo_url: r.cover_photo_url ?? '',
    price_range: (r.price_range ?? '') as AlgoliaRestaurant['price_range'],
    dietary_options: r.dietary_options ?? [],
    tags: r.tags ?? [],
  };
}
