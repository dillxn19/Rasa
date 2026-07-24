// Shared helpers for mapping Google Places (New API) data onto Rasa's schema.

// ─── Google primaryType / types → Rasa restaurant_category ────────────────────
const CATEGORY_BY_TYPE: Record<string, string> = {
  cafe: 'cafe',
  coffee_shop: 'cafe',
  bakery: 'cafe',
  bar: 'bar',
  pub: 'bar',
  wine_bar: 'bar',
  meal_takeaway: 'fast_food',
  fast_food_restaurant: 'fast_food',
  hamburger_restaurant: 'fast_food',
  food_court: 'food_court',
  buffet_restaurant: 'buffet',
  fine_dining_restaurant: 'fine_dining',
};

export function mapCategory(primaryType: string | undefined, types: string[] = [], name = ''): string {
  // Malaysian categories Google doesn't model — detect from the name first
  // (e.g. "Restoran … Maju Mamak", "OldTown Kopitiam", "… Hawker Centre").
  const n = name.toLowerCase();
  if (/\bmamak\b|nasi kandar/.test(n)) return 'mamak';
  if (/kopitiam|kedai kopi|白咖啡|kopi\b/.test(n)) return 'kopitiam';
  if (/hawker|food court|medan selera|kompleks makan|food centre|food center/.test(n)) return 'food_court';
  if (/\bcafe\b|café|coffee|roastery|kaffe/.test(n)) return 'cafe';

  if (primaryType && CATEGORY_BY_TYPE[primaryType]) return CATEGORY_BY_TYPE[primaryType];
  for (const t of types) {
    if (CATEGORY_BY_TYPE[t]) return CATEGORY_BY_TYPE[t];
  }
  return 'restaurant';
}

// ─── Google cuisine types → Rasa cuisine_type[] ───────────────────────────────
const CUISINE_BY_TYPE: Record<string, string> = {
  chinese_restaurant: 'chinese',
  indian_restaurant: 'indian',
  japanese_restaurant: 'japanese',
  korean_restaurant: 'korean',
  thai_restaurant: 'thai',
  vietnamese_restaurant: 'vietnamese',
  italian_restaurant: 'italian',
  french_restaurant: 'western',
  american_restaurant: 'western',
  steak_house: 'western',
  hamburger_restaurant: 'western',
  pizza_restaurant: 'italian',
  seafood_restaurant: 'seafood',
  sushi_restaurant: 'japanese',
  ramen_restaurant: 'japanese',
  vegetarian_restaurant: 'vegetarian',
  vegan_restaurant: 'vegetarian',
  middle_eastern_restaurant: 'middle_eastern',
  cafe: 'cafe',
  coffee_shop: 'cafe',
  bakery: 'bakery',
  dessert_shop: 'dessert',
  dessert_restaurant: 'dessert',
  ice_cream_shop: 'dessert',
};

export function mapCuisines(primaryType: string | undefined, types: string[] = []): string[] {
  const out = new Set<string>();
  const all = [primaryType, ...types].filter(Boolean) as string[];
  for (const t of all) {
    if (CUISINE_BY_TYPE[t]) out.add(CUISINE_BY_TYPE[t]);
  }
  return out.size ? [...out] : ['other'];
}

// ─── Google priceLevel enum → Rasa price_range ($..$$$$) ──────────────────────
export function mapPriceRange(priceLevel: string | undefined): string | null {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE':
    case 'PRICE_LEVEL_INEXPENSIVE': return '$';
    case 'PRICE_LEVEL_MODERATE': return '$$';
    case 'PRICE_LEVEL_EXPENSIVE': return '$$$';
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return '$$$$';
    default: return null;
  }
}

export function priceLevelToInt(priceLevel: string | undefined): number | null {
  switch (priceLevel) {
    case 'PRICE_LEVEL_FREE': return 0;
    case 'PRICE_LEVEL_INEXPENSIVE': return 1;
    case 'PRICE_LEVEL_MODERATE': return 2;
    case 'PRICE_LEVEL_EXPENSIVE': return 3;
    case 'PRICE_LEVEL_VERY_EXPENSIVE': return 4;
    default: return null;
  }
}

// ─── Address component extraction ─────────────────────────────────────────────
type AddrComp = { longText?: string; shortText?: string; types?: string[] };

function pick(components: AddrComp[], type: string, short = false): string | null {
  const c = components.find((x) => (x.types ?? []).includes(type));
  if (!c) return null;
  return (short ? c.shortText : c.longText) ?? null;
}

export function extractLocation(components: AddrComp[] = []) {
  const area =
    pick(components, 'sublocality_level_1') ??
    pick(components, 'sublocality') ??
    pick(components, 'neighborhood') ??
    null;
  const city =
    pick(components, 'locality') ??
    pick(components, 'administrative_area_level_2') ??
    'Kuala Lumpur';
  const state = pick(components, 'administrative_area_level_1');
  const postal = pick(components, 'postal_code');
  const country = pick(components, 'country') ?? 'Malaysia';
  return { area, city, state, postal, country };
}

// ─── Slug (name + place_id suffix → guaranteed unique) ────────────────────────
export function slugify(name: string, placeId: string): string {
  const base = name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'place';
  const suffix = placeId.replace(/[^a-zA-Z0-9]/g, '').slice(-6).toLowerCase();
  return `${base}-${suffix}`;
}
