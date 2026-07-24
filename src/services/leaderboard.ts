import { supabase } from '@/lib/supabase';
import type { TasteProfileType } from '@/types';

export type LeaderboardPeriod = 'weekly' | 'monthly' | 'alltime';

export interface LeaderboardEntry {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  city: string;
  taste_profile: TasteProfileType | null;
  review_count: number;
  rank: number;
}

function getPeriodStart(period: LeaderboardPeriod): string | null {
  if (period === 'alltime') return null;
  const now = new Date();
  if (period === 'weekly') {
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // week starts Monday
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString();
  }
  // monthly
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

export async function getFriendsLeaderboard(
  userId: string,
  period: LeaderboardPeriod,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  const { data: followingData } = await supabase
    .from('follows')
    .select('following_id')
    .eq('follower_id', userId);

  const followingIds = (followingData ?? []).map(f => f.following_id);
  const allIds = [...followingIds, userId]; // include self

  const { data: users } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, city, total_reviews, taste_profile')
    .in('id', allIds)
    .eq('is_active', true);

  if (!users?.length) return [];

  if (period === 'alltime') {
    return users
      .sort((a, b) => b.total_reviews - a.total_reviews)
      .slice(0, limit)
      .map((u, i) => ({
        id: u.id, username: u.username, display_name: u.display_name,
        avatar_url: u.avatar_url, city: u.city,
        taste_profile: u.taste_profile as TasteProfileType | null,
        review_count: u.total_reviews, rank: i + 1,
      }));
  }

  const since = getPeriodStart(period)!;
  const { data: reviewRows } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('is_public', true)
    .gte('created_at', since)
    .in('user_id', allIds);

  const counts = new Map<string, number>();
  (reviewRows ?? []).forEach(r => counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1));

  return users
    .map(u => ({ ...u, review_count: counts.get(u.id) ?? 0 }))
    .sort((a, b) => b.review_count - a.review_count)
    .slice(0, limit)
    .map((u, i) => ({
      id: u.id, username: u.username, display_name: u.display_name,
      avatar_url: u.avatar_url, city: u.city,
      taste_profile: u.taste_profile as TasteProfileType | null,
      review_count: u.review_count, rank: i + 1,
    }));
}

/** Campus leaderboard — same shape as city, filtered to one school. */
export async function getSchoolLeaderboard(
  school: string,
  period: LeaderboardPeriod,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  return leaderboardBy('school', school, period, limit);
}

export async function getLeaderboard(
  city: string,
  period: LeaderboardPeriod,
  limit = 20,
): Promise<LeaderboardEntry[]> {
  return leaderboardBy('city', city, period, limit);
}

async function leaderboardBy(
  column: 'city' | 'school',
  value: string,
  period: LeaderboardPeriod,
  limit: number,
): Promise<LeaderboardEntry[]> {
  const { data: cityUsers } = await supabase
    .from('users')
    .select('id, username, display_name, avatar_url, city, total_reviews, taste_profile')
    .eq(column, value)
    .eq('is_active', true)
    .gt('total_reviews', 0);

  if (!cityUsers?.length) return [];

  if (period === 'alltime') {
    return cityUsers
      .sort((a, b) => b.total_reviews - a.total_reviews)
      .slice(0, limit)
      .map((u, i) => ({
        id: u.id,
        username: u.username,
        display_name: u.display_name,
        avatar_url: u.avatar_url,
        city: u.city,
        taste_profile: u.taste_profile as TasteProfileType | null,
        review_count: u.total_reviews,
        rank: i + 1,
      }));
  }

  const since = getPeriodStart(period)!;
  const { data: reviewRows } = await supabase
    .from('reviews')
    .select('user_id')
    .eq('is_public', true)
    .gte('created_at', since)
    .in('user_id', cityUsers.map(u => u.id));

  const counts = new Map<string, number>();
  (reviewRows ?? []).forEach(r => {
    counts.set(r.user_id, (counts.get(r.user_id) ?? 0) + 1);
  });

  return cityUsers
    .map(u => ({ ...u, review_count: counts.get(u.id) ?? 0 }))
    .filter(u => u.review_count > 0)
    .sort((a, b) => b.review_count - a.review_count)
    .slice(0, limit)
    .map((u, i) => ({
      id: u.id,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      city: u.city,
      taste_profile: u.taste_profile as TasteProfileType | null,
      review_count: u.review_count,
      rank: i + 1,
    }));
}
