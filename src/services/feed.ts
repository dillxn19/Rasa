import { supabase } from '@/lib/supabase';
import type { FeedItem } from '@/types';

export async function getHomeFeed(userId: string, page = 0, limit = 20): Promise<FeedItem[]> {
  const { data, error } = await supabase.rpc('get_home_feed', {
    p_user_id: userId,
    p_limit: limit,
    p_offset: page * limit,
  });

  if (error) {
    // RPC not deployed yet — fall back to direct query
    return getFollowsActivityFallback(userId, page, limit);
  }

  // Filter out 'visit' events — every review creates both a 'review' + 'visit' event
  const rows = (data as Record<string, unknown>[]).filter(row => row.event_type !== 'visit');

  const items = rows.map(row => ({
    id: row.event_id as string,
    type: row.event_type as FeedItem['type'],
    created_at: row.created_at as string,
    actor: {
      id: row.actor_id as string,
      username: row.actor_username as string,
      display_name: row.actor_display_name as string,
      avatar_url: row.actor_avatar_url as string | null,
    },
    restaurant: row.restaurant_id ? {
      id: row.restaurant_id as string,
      name: row.restaurant_name as string,
      cover_photo_url: row.restaurant_cover_url as string | null,
      category: row.restaurant_category as string,
    } : undefined,
    review: row.review_id ? {
      id: row.review_id as string,
      rating: row.review_rating as number,
      content: row.review_content as string | null,
      photos: (row.review_photos as string[]) ?? [],
      like_count: row.review_like_count as number,
      comment_count: row.review_comment_count as number,
    } : undefined,
    list: row.list_id ? {
      id: row.list_id as string,
      title: row.list_title as string,
    } : undefined,
    badge: row.badge_name ? { name: row.badge_name as string } : undefined,
    data: (row.data as Record<string, unknown>) ?? {},
  })) as FeedItem[];

  return attachLikedState(items, userId);
}

async function attachLikedState(items: FeedItem[], userId: string): Promise<FeedItem[]> {
  const reviewIds = items.flatMap(i => i.review ? [i.review.id] : []);
  if (!reviewIds.length) return items;

  const { data: likedRows } = await supabase
    .from('likes')
    .select('review_id')
    .eq('user_id', userId)
    .in('review_id', reviewIds);

  const likedSet = new Set((likedRows ?? []).map(l => l.review_id as string));
  return items.map(item =>
    item.review
      ? { ...item, review: { ...item.review, is_liked: likedSet.has(item.review.id) } }
      : item,
  );
}

async function getFollowsActivityFallback(userId: string, page = 0, limit = 20): Promise<FeedItem[]> {
  const { data: followsData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  if (!followsData?.length) return [];

  const followingIds = followsData.map(f => f.following_id);

  const { data } = await supabase
    .from('activity_events')
    .select(`
      id, type, created_at, data,
      user:users!user_id(id, username, display_name, avatar_url),
      restaurant:restaurants!restaurant_id(id, name, slug, cover_photo_url, category, overall_rating),
      review:reviews!review_id(id, rating, content, photos, like_count, comment_count),
      list:lists!list_id(id, title, cover_photo_url, restaurant_count),
      badge:badges!badge_id(id, name, icon_emoji, category)
    `)
    .eq('is_public', true)
    .in('user_id', followingIds)
    .neq('type', 'visit')
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  const items = (data?.map(row => ({
    id: row.id,
    type: row.type,
    created_at: row.created_at,
    actor: row.user,
    restaurant: row.restaurant,
    review: row.review,
    list: row.list,
    badge: row.badge,
    data: row.data ?? {},
  })) ?? []) as unknown as FeedItem[];

  return attachLikedState(items, userId);
}

export async function getGlobalFeed(page = 0, limit = 20): Promise<FeedItem[]> {
  const { data, error } = await supabase
    .from('activity_events')
    .select(`
      id, type, created_at, data,
      user:users!user_id (
        id, username, display_name, avatar_url, taste_profile
      ),
      restaurant:restaurants!restaurant_id (
        id, name, slug, cover_photo_url, category, overall_rating
      ),
      review:reviews!review_id (
        id, rating, content, photos, like_count, comment_count
      ),
      list:lists!list_id (
        id, title, cover_photo_url, restaurant_count
      ),
      badge:badges!badge_id (
        id, name, icon_emoji, category
      )
    `)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(page * limit, (page + 1) * limit - 1);

  if (error) throw error;

  return (data?.map(row => ({
    id: row.id,
    type: row.type,
    created_at: row.created_at,
    actor: row.user,
    restaurant: row.restaurant,
    review: row.review,
    list: row.list,
    badge: row.badge,
    data: row.data ?? {},
  })) ?? []) as unknown as FeedItem[];
}

export async function getNotifications(userId: string, page = 0): Promise<{
  notifications: Array<{
    id: string;
    type: string;
    title: string;
    body: string | null;
    is_read: boolean;
    created_at: string;
    actor: { id: string; username: string; avatar_url: string | null } | null;
    data: Record<string, unknown>;
  }>;
  unread_count: number;
}> {
  const [notificationsResult, countResult] = await Promise.all([
    supabase
      .from('notifications')
      .select(`
        id, type, title, body, is_read, created_at, data,
        actor:users!actor_id (
          id, username, display_name, avatar_url
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(page * 30, (page + 1) * 30 - 1),
    supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false),
  ]);

  if (notificationsResult.error) throw notificationsResult.error;

  return {
    notifications: (notificationsResult.data ?? []) as typeof notificationsResult.data & { actor: unknown },
    unread_count: countResult.count ?? 0,
  } as ReturnType<typeof getNotifications> extends Promise<infer T> ? T : never;
}

export async function markNotificationsRead(userId: string, notificationIds?: string[]): Promise<void> {
  let query = supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', userId);

  if (notificationIds && notificationIds.length > 0) {
    query = query.in('id', notificationIds);
  }

  const { error } = await query;
  if (error) throw error;
}
