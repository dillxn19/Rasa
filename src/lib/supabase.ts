import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DbUser, DbRestaurant, DbReview, DbList, DbNotification, DbActivityEvent } from '@/types/database';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Copy .env.example to .env and fill in values.');
}

// Typed database schema for Supabase client
export interface Database {
  public: {
    Tables: {
      users: { Row: DbUser; Insert: Partial<DbUser>; Update: Partial<DbUser> };
      restaurants: { Row: DbRestaurant; Insert: Partial<DbRestaurant>; Update: Partial<DbRestaurant> };
      reviews: { Row: DbReview; Insert: Partial<DbReview>; Update: Partial<DbReview> };
      lists: { Row: DbList; Insert: Partial<DbList>; Update: Partial<DbList> };
      notifications: { Row: DbNotification; Insert: Partial<DbNotification>; Update: Partial<DbNotification> };
      activity_events: { Row: DbActivityEvent; Insert: Partial<DbActivityEvent>; Update: Partial<DbActivityEvent> };
    };
    Functions: {
      get_home_feed: {
        Args: { p_user_id: string; p_limit?: number; p_offset?: number };
        Returns: unknown[];
      };
      generate_recommendations: {
        Args: { p_user_id: string };
        Returns: void;
      };
      calculate_taste_similarity: {
        Args: { p_user_id_1: string; p_user_id_2: string };
        Returns: number;
      };
      get_nearby_restaurants: {
        Args: { p_lat: number; p_lng: number; p_radius_km?: number; p_limit?: number };
        Returns: unknown[];
      };
      auth_user_id: { Args: Record<string, never>; Returns: string };
    };
  };
}

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    headers: {
      'x-app-version': '1.0.0',
      'x-platform': 'mobile',
    },
  },
  realtime: {
    params: { eventsPerSecond: 10 },
  },
});

// ─── Storage helpers ─────────────────────────────────────────

export const STORAGE_BUCKETS = {
  avatars: 'avatars',
  restaurantPhotos: 'restaurant-photos',
  listCovers: 'list-covers',
  reviewPhotos: 'review-photos',
} as const;

export async function uploadAvatar(userId: string, blob: Blob): Promise<string> {
  const filename = `${userId}/avatar_${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .upload(filename, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  return supabase.storage.from(STORAGE_BUCKETS.avatars).getPublicUrl(data.path).data.publicUrl;
}

export async function uploadReviewPhoto(userId: string, blob: Blob): Promise<string> {
  const filename = `${userId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.reviewPhotos)
    .upload(filename, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(STORAGE_BUCKETS.reviewPhotos).getPublicUrl(data.path).data.publicUrl;
}

export async function uploadRestaurantPhoto(restaurantId: string, blob: Blob): Promise<string> {
  const filename = `${restaurantId}/${Date.now()}.jpg`;
  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKETS.restaurantPhotos)
    .upload(filename, blob, { contentType: 'image/jpeg' });
  if (error) throw error;
  return supabase.storage.from(STORAGE_BUCKETS.restaurantPhotos).getPublicUrl(data.path).data.publicUrl;
}

// ─── Realtime subscriptions ──────────────────────────────────

export function subscribeToNotifications(userId: string, callback: (notification: DbNotification) => void) {
  return supabase
    .channel(`notifications:${userId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`,
      },
      (payload) => callback(payload.new as DbNotification)
    )
    .subscribe();
}

export function subscribeToFeedUpdates(followingIds: string[], callback: () => void) {
  return supabase
    .channel('feed_updates')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'activity_events',
        filter: `user_id=in.(${followingIds.join(',')})`,
      },
      () => callback()
    )
    .subscribe();
}
