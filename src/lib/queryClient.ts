import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,       // 2 minutes
      gcTime: 1000 * 60 * 10,          // 10 minutes cache
      retry: (failureCount, error) => {
        // Don't retry on 4xx errors
        if (error instanceof Error && error.message.includes('40')) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

// Query key factory for type-safe, consistent cache keys
export const queryKeys = {
  // Auth
  currentUser: () => ['currentUser'] as const,

  // Users
  user: (username: string) => ['user', username] as const,
  userById: (id: string) => ['user', 'id', id] as const,
  userFollowers: (id: string) => ['user', id, 'followers'] as const,
  userFollowing: (id: string) => ['user', id, 'following'] as const,
  userReviews: (id: string) => ['user', id, 'reviews'] as const,
  userVisits: (id: string) => ['user', id, 'visits'] as const,
  userLists: (id: string) => ['user', id, 'lists'] as const,
  userBadges: (id: string) => ['user', id, 'badges'] as const,
  userPassport: (id: string) => ['user', id, 'passport'] as const,
  userTasteMatches: (id: string) => ['user', id, 'taste-matches'] as const,

  // Restaurants
  restaurant: (idOrSlug: string) => ['restaurant', idOrSlug] as const,
  restaurantReviews: (id: string) => ['restaurant', id, 'reviews'] as const,
  restaurantPhotos: (id: string) => ['restaurant', id, 'photos'] as const,
  restaurantNearby: (lat: number, lng: number) => ['restaurants', 'nearby', lat, lng] as const,

  // Feed
  homeFeed: () => ['feed', 'home'] as const,
  exploreRestaurants: (city?: string) => ['restaurants', 'explore', city] as const,

  // Recommendations
  recommendations: (userId: string) => ['recommendations', userId] as const,

  // Search
  search: (query: string) => ['search', query] as const,
  searchRestaurants: (params: Record<string, unknown>) => ['search', 'restaurants', params] as const,

  // Lists
  list: (id: string) => ['list', id] as const,
  listItems: (id: string) => ['list', id, 'items'] as const,
  publicLists: (city?: string) => ['lists', 'public', city] as const,

  // Notifications
  notifications: (userId: string) => ['notifications', userId] as const,
  unreadCount: (userId: string) => ['notifications', userId, 'unread'] as const,

  // Saved
  savedRestaurants: (userId: string) => ['saved', userId] as const,

  // Dishes
  dish: (idOrSlug: string) => ['dish', idOrSlug] as const,
  dishesByMealTime: (mealTime: string) => ['dishes', 'meal-time', mealTime] as const,
  featuredDishes: () => ['dishes', 'featured'] as const,
  dishSearch: (query: string) => ['dishes', 'search', query] as const,
  savedDishes: (userId: string) => ['dishes', 'saved', userId] as const,

  // Trails
  trail: (id: string) => ['trail', id] as const,
  trailsByCity: (city?: string) => ['trails', 'city', city] as const,
  featuredTrails: () => ['trails', 'featured'] as const,
  userFollowedTrails: (userId: string) => ['trails', 'following', userId] as const,
} as const;
