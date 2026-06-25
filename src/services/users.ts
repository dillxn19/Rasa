import { supabase } from '@/lib/supabase';
import type { User, TasteMatch, FoodPassport, Badge, Review, Restaurant, List } from '@/types';

export async function getUserByUsername(username: string, currentUserId?: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .eq('is_active', true)
    .single();

  if (error) throw error;
  if (!data) throw new Error('User not found');

  const user = data as User;

  if (currentUserId && currentUserId !== user.id) {
    const [followResult, followBackResult] = await Promise.all([
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', currentUserId)
        .eq('following_id', user.id)
        .maybeSingle(),
      supabase
        .from('follows')
        .select('id')
        .eq('follower_id', user.id)
        .eq('following_id', currentUserId)
        .maybeSingle(),
    ]);

    user.is_following = !!followResult.data;
    user.is_followed_by = !!followBackResult.data;

    // Get taste match score
    const { data: tasteData } = await supabase
      .from('taste_similarity')
      .select('similarity_score')
      .or(
        `and(user_id_1.eq.${currentUserId},user_id_2.eq.${user.id}),` +
        `and(user_id_1.eq.${user.id},user_id_2.eq.${currentUserId})`
      )
      .maybeSingle();

    if (tasteData) {
      user.taste_match_score = Math.round(tasteData.similarity_score * 100);
    }
  }

  return user;
}

export async function getUserById(id: string): Promise<User> {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', id)
    .single();

  if (error) throw error;
  return data as User;
}

export async function getUserFollowers(userId: string, page = 0): Promise<User[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:users!follower_id(*)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(page * 30, (page + 1) * 30 - 1);

  if (error) throw error;
  return (data?.map(d => d.follower) ?? []) as User[];
}

export async function getUserFollowing(userId: string, page = 0): Promise<User[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following:users!following_id(*)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(page * 30, (page + 1) * 30 - 1);

  if (error) throw error;
  return (data?.map(d => d.following) ?? []) as User[];
}

export async function followUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .insert({ follower_id: followerId, following_id: followingId });
  if (error && !error.message.includes('duplicate')) throw error;

  // Trigger taste similarity calculation asynchronously
  supabase.rpc('calculate_taste_similarity', {
    p_user_id_1: followerId,
    p_user_id_2: followingId,
  }).then(() => {}).catch(() => {});
}

export async function unfollowUser(followerId: string, followingId: string): Promise<void> {
  const { error } = await supabase
    .from('follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) throw error;
}

export async function getUserBadges(userId: string): Promise<Badge[]> {
  const { data, error } = await supabase
    .from('user_badges')
    .select('earned_at, badge:badges(*)')
    .eq('user_id', userId)
    .order('earned_at', { ascending: false });

  if (error) throw error;

  return (data?.map(d => ({
    ...d.badge,
    earned_at: d.earned_at,
    is_earned: true,
  })) ?? []) as Badge[];
}

export async function getUserPassport(userId: string): Promise<FoodPassport> {
  const { data, error } = await supabase
    .from('food_passports')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) throw error;
  return data as FoodPassport;
}

export async function getUserReviews(userId: string, page = 0): Promise<Review[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select(`
      *,
      restaurant:restaurants!restaurant_id (
        id, name, slug, cover_photo_url, category, city, overall_rating
      )
    `)
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .range(page * 20, (page + 1) * 20 - 1);

  if (error) throw error;
  return (data as Review[]) ?? [];
}

export async function getTasteMatches(userId: string, limit = 10): Promise<TasteMatch[]> {
  const { data, error } = await supabase
    .from('taste_similarity')
    .select(`
      similarity_score,
      common_restaurants,
      user1:users!user_id_1 (
        id, username, display_name, avatar_url, city, total_reviews, taste_profile
      ),
      user2:users!user_id_2 (
        id, username, display_name, avatar_url, city, total_reviews, taste_profile
      )
    `)
    .or(`user_id_1.eq.${userId},user_id_2.eq.${userId}`)
    .gt('similarity_score', 0.3)
    .order('similarity_score', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data?.map(d => {
    const matchedUser = (d.user1 as unknown as User)?.id === userId ? d.user2 : d.user1;
    return {
      user: matchedUser as unknown as User,
      match_score: d.similarity_score,
      match_percentage: Math.round(d.similarity_score * 100),
      common_restaurants: [],
      recommended_restaurants: [],
    };
  }) ?? []) as TasteMatch[];
}

export async function getSuggestedUsers(userId: string, limit = 10): Promise<User[]> {
  // Suggest friends-of-friends who user doesn't follow
  const { data, error } = await supabase
    .from('follows')
    .select(`
      following:users!following_id (
        id, username, display_name, avatar_url, city,
        follower_count, total_reviews, taste_profile
      )
    `)
    .in('follower_id',
      supabase
        .from('follows')
        .select('following_id')
        .eq('follower_id', userId)
    )
    .not('following_id', 'eq', userId)
    .not('following_id', 'in',
      `(${supabase.from('follows').select('following_id').eq('follower_id', userId)})`
    )
    .limit(limit);

  if (error) throw error;

  const uniqueUsers = new Map<string, User>();
  data?.forEach(d => {
    const user = d.following as unknown as User;
    if (user && !uniqueUsers.has(user.id)) {
      uniqueUsers.set(user.id, user);
    }
  });

  return Array.from(uniqueUsers.values());
}

export async function updatePushToken(userId: string, token: string): Promise<void> {
  await supabase
    .from('users')
    .update({ push_token: token })
    .eq('id', userId);
}

export async function checkUsernameAvailable(username: string): Promise<boolean> {
  const { data } = await supabase
    .from('users')
    .select('id')
    .eq('username', username.toLowerCase())
    .maybeSingle();
  return !data;
}

export async function getUserLists(userId: string): Promise<List[]> {
  const { data, error } = await supabase
    .from('lists')
    .select('*, items:list_items(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as List[];
}
