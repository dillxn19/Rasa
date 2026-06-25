import { algoliasearch } from 'algoliasearch';
import type { AlgoliaRestaurant, Restaurant, User, List } from '@/types';

const appId = process.env.EXPO_PUBLIC_ALGOLIA_APP_ID!;
const searchKey = process.env.EXPO_PUBLIC_ALGOLIA_SEARCH_KEY!;

export const algoliaClient = algoliasearch(appId, searchKey);

export const ALGOLIA_INDICES = {
  restaurants: 'rasa_restaurants',
  restaurants_by_rating: 'rasa_restaurants_by_rating',
  restaurants_nearby: 'rasa_restaurants_nearby',
  users: 'rasa_users',
  lists: 'rasa_lists',
} as const;

// ─── Search functions ─────────────────────────────────────────

export interface RestaurantSearchParams {
  query: string;
  city?: string;
  category?: string;
  cuisines?: string[];
  dietary?: string[];
  priceRange?: string[];
  lat?: number;
  lng?: number;
  radiusKm?: number;
  page?: number;
  hitsPerPage?: number;
}

export async function searchRestaurants(params: RestaurantSearchParams): Promise<{
  hits: AlgoliaRestaurant[];
  nbHits: number;
  page: number;
  nbPages: number;
}> {
  const {
    query,
    city,
    category,
    cuisines = [],
    dietary = [],
    priceRange = [],
    lat,
    lng,
    radiusKm = 10,
    page = 0,
    hitsPerPage = 20,
  } = params;

  const filters: string[] = [];

  if (city) filters.push(`city:"${city}"`);
  if (category) filters.push(`category:"${category}"`);
  if (cuisines.length > 0) {
    filters.push(`(${cuisines.map(c => `cuisines:"${c}"`).join(' OR ')})`);
  }
  if (dietary.length > 0) {
    dietary.forEach(d => filters.push(`dietary_options:"${d}"`));
  }
  if (priceRange.length > 0) {
    filters.push(`(${priceRange.map(p => `price_range:"${p}"`).join(' OR ')})`);
  }

  const searchParams: Record<string, unknown> = {
    query,
    filters: filters.join(' AND '),
    page,
    hitsPerPage,
    attributesToHighlight: ['name', 'address', 'tags'],
    attributesToRetrieve: [
      'objectID', 'name', 'slug', 'category', 'cuisines', 'city', 'area',
      'address', 'overall_rating', 'total_reviews', 'cover_photo_url',
      'price_range', 'dietary_options', 'tags', '_geoloc',
    ],
  };

  if (lat !== undefined && lng !== undefined) {
    searchParams.aroundLatLng = `${lat}, ${lng}`;
    searchParams.aroundRadius = radiusKm * 1000;
  }

  const indexName = lat !== undefined ? ALGOLIA_INDICES.restaurants_nearby : ALGOLIA_INDICES.restaurants;

  const result = await algoliaClient.searchSingleIndex({
    indexName,
    searchParams,
  });

  return {
    hits: result.hits as unknown as AlgoliaRestaurant[],
    nbHits: result.nbHits ?? 0,
    page: result.page ?? 0,
    nbPages: result.nbPages ?? 0,
  };
}

export async function searchUsers(query: string, page = 0): Promise<User[]> {
  const result = await algoliaClient.searchSingleIndex({
    indexName: ALGOLIA_INDICES.users,
    searchParams: {
      query,
      hitsPerPage: 20,
      page,
      attributesToRetrieve: [
        'objectID', 'username', 'display_name', 'avatar_url',
        'city', 'total_reviews', 'follower_count', 'taste_profile',
      ],
    },
  });
  return result.hits as unknown as User[];
}

export async function searchLists(query: string, page = 0): Promise<List[]> {
  const result = await algoliaClient.searchSingleIndex({
    indexName: ALGOLIA_INDICES.lists,
    searchParams: {
      query,
      hitsPerPage: 20,
      page,
      filters: 'visibility:public',
      attributesToRetrieve: [
        'objectID', 'title', 'description', 'cover_photo_url',
        'restaurant_count', 'follower_count', 'user',
      ],
    },
  });
  return result.hits as unknown as List[];
}

export async function multiSearch(query: string) {
  const [restaurants, users, lists] = await Promise.all([
    searchRestaurants({ query, hitsPerPage: 6 }),
    searchUsers(query),
    searchLists(query),
  ]);

  return {
    restaurants: restaurants.hits,
    users,
    lists,
    total: restaurants.nbHits + users.length + lists.length,
    query,
  };
}

// ─── Suggest (autocomplete) ───────────────────────────────────

export async function getSuggestions(query: string): Promise<string[]> {
  if (query.length < 2) return [];

  const result = await algoliaClient.searchSingleIndex({
    indexName: ALGOLIA_INDICES.restaurants,
    searchParams: {
      query,
      hitsPerPage: 5,
      attributesToRetrieve: ['name'],
      restrictSearchableAttributes: ['name'],
    },
  });

  return (result.hits as Array<{ name: string }>).map(h => h.name);
}
