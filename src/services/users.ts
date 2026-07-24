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

export async function getUserFollowers(userId: string, page = 0, currentUserId?: string): Promise<User[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('follower:users!follower_id(*)')
    .eq('following_id', userId)
    .order('created_at', { ascending: false })
    .range(page * 30, (page + 1) * 30 - 1);

  if (error) throw error;
  const followers = (data?.map(d => d.follower) ?? []) as User[];
  if (!currentUserId || followers.length === 0) return followers;

  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', currentUserId)
    .in('following_id', followers.map(f => f.id));

  const followingSet = new Set((followingData ?? []).map(f => f.following_id));
  return followers.map(f => ({ ...f, is_following: followingSet.has(f.id) }));
}

export async function getUserFollowing(userId: string, page = 0): Promise<User[]> {
  const { data, error } = await supabase
    .from('follows')
    .select('following:users!following_id(*)')
    .eq('follower_id', userId)
    .order('created_at', { ascending: false })
    .range(page * 30, (page + 1) * 30 - 1);

  if (error) throw error;
  return (data?.map(d => ({ ...(d.following as User), is_following: true })) ?? []) as User[];
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
        id, name, slug, cover_photo_url, category, city, area, overall_rating, latitude, longitude
      )
    `)
    .eq('user_id', userId)
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    // (rank_score comes through via * — used to order the Rankings tab)
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

export async function getDiscoverUsers(currentUserId: string, limit = 40): Promise<User[]> {
  const [{ data: users }, { data: followingData }] = await Promise.all([
    supabase
      .from('users')
      .select('id, username, display_name, avatar_url, city, follower_count, total_reviews, taste_profile')
      .eq('is_active', true)
      .neq('id', currentUserId)
      .order('total_reviews', { ascending: false })
      .limit(limit),
    supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', currentUserId),
  ]);

  // Keep people you already follow in the list (marked is_following) so you can
  // still find them here — don't filter them out.
  const followingIds = new Set((followingData ?? []).map(f => f.following_id));
  return ((users ?? []) as User[]).map(u => ({ ...u, is_following: followingIds.has(u.id) }));
}

export interface StreakResult {
  /** Current streak length in weeks. */
  weeks: number;
  /** True when this review opened a brand-new weekly slot (weekly coins awarded). */
  newWeek: boolean;
  /** True when this review hit a 5-week milestone (bonus coins awarded). */
  milestone: boolean;
}

export async function updateReviewStreak(userId: string): Promise<StreakResult> {
  const { data: passport } = await supabase
    .from('food_passports')
    .select('streak_days, last_activity_date, streak_week_start')
    .eq('user_id', userId)
    .single();

  if (!passport) return { weeks: 0, newWeek: false, milestone: false };

  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const lastActivityStr = passport.last_activity_date as string | null;

  if (lastActivityStr === todayStr) {
    // already reviewed today — no change
    return { weeks: passport.streak_days ?? 1, newWeek: false, milestone: false };
  }

  // No prior activity — start streak at week 1
  if (!lastActivityStr) {
    await supabase
      .from('food_passports')
      .update({ streak_days: 1, last_activity_date: todayStr, streak_week_start: todayStr, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return { weeks: 1, newWeek: true, milestone: false };
  }

  const lastActivity = new Date(lastActivityStr);
  const daysSinceLast = Math.floor((today.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceLast >= 7) {
    // Streak broken — reset to week 1
    await supabase
      .from('food_passports')
      .update({ streak_days: 1, last_activity_date: todayStr, streak_week_start: todayStr, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return { weeks: 1, newWeek: true, milestone: false };
  }

  // Within 7 days — check if we've already credited this week's slot
  const weekStartStr = (passport.streak_week_start as string | null) ?? lastActivityStr;
  const weekStart = new Date(weekStartStr);
  const daysSinceWeekStart = Math.floor((today.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24));

  if (daysSinceWeekStart < 7) {
    // Still in same week slot — just extend the last_activity so the window doesn't shrink
    await supabase
      .from('food_passports')
      .update({ last_activity_date: todayStr, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    return { weeks: passport.streak_days ?? 1, newWeek: false, milestone: false };
  }

  // New week slot completed — increment streak and award coins
  const newStreak = (passport.streak_days ?? 0) + 1;
  const milestone = newStreak % 5 === 0;
  await supabase
    .from('food_passports')
    .update({ streak_days: newStreak, last_activity_date: todayStr, streak_week_start: todayStr, updated_at: new Date().toISOString() })
    .eq('user_id', userId);

  // Award weekly streak coins (fire and forget — don't block review flow)
  const { awardCoins, COIN_AMOUNTS } = await import('./coins');
  awardCoins(userId, COIN_AMOUNTS.streak_week, 'streak_week', `Week ${newStreak} streak`).catch(() => {});
  if (milestone) {
    awardCoins(userId, COIN_AMOUNTS.streak_milestone_5, 'streak_milestone', `${newStreak}-week streak milestone!`).catch(() => {});
  }

  return { weeks: newStreak, newWeek: true, milestone };
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

export async function searchUsers(query: string, excludeId?: string, limit = 20): Promise<User[]> {
  const { data } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, city, total_reviews, taste_profile')
    .or(`display_name.ilike.%${query}%,username.ilike.%${query}%`)
    .eq('is_active', true)
    .order('total_reviews', { ascending: false })
    .limit(limit);

  const results = (data ?? []) as User[];
  return excludeId ? results.filter(u => u.id !== excludeId) : results;
}

export interface TasteAnalytics {
  total: number;
  avgRating: number;
  /** Counts per star bucket, index 0 = 1★ … 4 = 5★. */
  distribution: number[];
  topCategories: { key: string; count: number; avg: number }[];
}

/** Aggregates the user's whole review history into palate stats (taste_analytics). */
export async function getTasteAnalytics(userId: string): Promise<TasteAnalytics> {
  const { data } = await supabase
    .from('reviews')
    .select('rating, restaurant:restaurants!restaurant_id(category)')
    .eq('user_id', userId);

  const rows = (data ?? []) as { rating: number; restaurant: { category?: string } | null }[];
  const total = rows.length;
  const avgRating = total ? rows.reduce((s, r) => s + (r.rating ?? 0), 0) / total : 0;

  const distribution = [0, 0, 0, 0, 0];
  const catCount = new Map<string, number>();
  const catSum = new Map<string, number>();
  for (const r of rows) {
    const bucket = Math.min(4, Math.max(0, Math.round(r.rating ?? 0) - 1));
    distribution[bucket]++;
    const cat = r.restaurant?.category;
    if (cat) {
      catCount.set(cat, (catCount.get(cat) ?? 0) + 1);
      catSum.set(cat, (catSum.get(cat) ?? 0) + (r.rating ?? 0));
    }
  }
  const topCategories = [...catCount.entries()]
    .map(([key, count]) => ({ key, count, avg: (catSum.get(key) ?? 0) / count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  return { total, avgRating, distribution, topCategories };
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
