import { supabase } from '@/lib/supabase';
import type { FoodTrail, FoodTrailStop } from '@/types';
import type { DbUserTrailProgress } from '@/types/database';

// ─── Fetch ───────────────────────────────────────────────────

export async function getFoodTrails(params: {
  city?: string;
  difficulty?: string;
  featured?: boolean;
  userId?: string;
  limit?: number;
  offset?: number;
}): Promise<FoodTrail[]> {
  let query = supabase
    .from('food_trails')
    .select(`
      *,
      creator:users(id, username, display_name, avatar_url)
    `)
    .eq('is_published', true);

  if (params.city) query = query.eq('city', params.city);
  if (params.difficulty) query = query.eq('difficulty', params.difficulty);
  if (params.featured) query = query.eq('is_featured', true);

  query = query
    .order('is_featured', { ascending: false })
    .order('follower_count', { ascending: false })
    .range(params.offset ?? 0, (params.offset ?? 0) + (params.limit ?? 20) - 1);

  const { data, error } = await query;
  if (error || !data) return [];

  if (!params.userId) return data as FoodTrail[];

  const [progressData, followData] = await Promise.all([
    getUserTrailProgress(params.userId, data.map(t => t.id)),
    getUserTrailFollows(params.userId, data.map(t => t.id)),
  ]);

  const progressMap = Object.fromEntries(progressData.map(p => [p.trail_id, p]));
  const followSet = new Set(followData.map(f => f.trail_id));

  return data.map(trail => ({
    ...trail,
    user_progress: progressMap[trail.id] ?? null,
    is_following: followSet.has(trail.id),
  })) as FoodTrail[];
}

export async function getTrailBySlug(slug: string, userId?: string): Promise<FoodTrail | null> {
  const { data, error } = await supabase
    .from('food_trails')
    .select(`
      *,
      creator:users(id, username, display_name, avatar_url),
      stops:food_trail_stops(
        *,
        restaurant:restaurants(*)
      )
    `)
    .eq('slug', slug)
    .single();

  if (error || !data) return null;

  // Sort stops by position
  const trail = data as FoodTrail;
  if (trail.stops) {
    trail.stops = (trail.stops as FoodTrailStop[]).sort((a, b) => a.position - b.position);
  }

  if (!userId) return trail;

  const [progress, isFollowing] = await Promise.all([
    getTrailProgress(userId, data.id),
    isTrailFollowed(userId, data.id),
  ]);

  if (progress && trail.stops) {
    trail.stops = trail.stops.map(stop => ({
      ...stop,
      is_completed: progress.completed_stops.includes(stop.id),
    }));
  }

  return {
    ...trail,
    user_progress: progress,
    is_following: isFollowing,
  };
}

export async function getTrailById(id: string, userId?: string): Promise<FoodTrail | null> {
  const { data, error } = await supabase
    .from('food_trails')
    .select(`
      *,
      creator:users(id, username, display_name, avatar_url),
      stops:food_trail_stops(
        *,
        restaurant:restaurants(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const trail = data as FoodTrail;
  if (trail.stops) {
    trail.stops = (trail.stops as FoodTrailStop[]).sort((a, b) => a.position - b.position);
  }

  if (!userId) return trail;

  const [progress, isFollowing] = await Promise.all([
    getTrailProgress(userId, id),
    isTrailFollowed(userId, id),
  ]);

  if (progress && trail.stops) {
    trail.stops = trail.stops.map(stop => ({
      ...stop,
      is_completed: progress.completed_stops.includes(stop.id),
    }));
  }

  return {
    ...trail,
    user_progress: progress,
    is_following: isFollowing,
  };
}

// ─── User progress helpers ────────────────────────────────────

async function getTrailProgress(userId: string, trailId: string): Promise<DbUserTrailProgress | null> {
  const { data } = await supabase
    .from('user_trail_progress')
    .select('*')
    .eq('user_id', userId)
    .eq('trail_id', trailId)
    .maybeSingle();

  return data ?? null;
}

async function getUserTrailProgress(userId: string, trailIds: string[]): Promise<DbUserTrailProgress[]> {
  if (trailIds.length === 0) return [];
  const { data } = await supabase
    .from('user_trail_progress')
    .select('*')
    .eq('user_id', userId)
    .in('trail_id', trailIds);

  return (data ?? []) as DbUserTrailProgress[];
}

async function isTrailFollowed(userId: string, trailId: string): Promise<boolean> {
  const { data } = await supabase
    .from('trail_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('trail_id', trailId)
    .maybeSingle();

  return !!data;
}

async function getUserTrailFollows(userId: string, trailIds: string[]): Promise<{ trail_id: string }[]> {
  if (trailIds.length === 0) return [];
  const { data } = await supabase
    .from('trail_follows')
    .select('trail_id')
    .eq('user_id', userId)
    .in('trail_id', trailIds);

  return (data ?? []) as { trail_id: string }[];
}

// ─── Follow / unfollow ────────────────────────────────────────

export async function followTrail(userId: string, trailId: string): Promise<boolean> {
  const { error } = await supabase
    .from('trail_follows')
    .insert({ user_id: userId, trail_id: trailId });

  return !error;
}

export async function unfollowTrail(userId: string, trailId: string): Promise<boolean> {
  const { error } = await supabase
    .from('trail_follows')
    .delete()
    .eq('user_id', userId)
    .eq('trail_id', trailId);

  return !error;
}

// ─── Progress tracking ────────────────────────────────────────

export async function markStopCompleted(
  userId: string,
  trailId: string,
  stopId: string
): Promise<DbUserTrailProgress | null> {
  // Upsert progress row — start if doesn't exist, add stopId to completed_stops
  const existing = await getTrailProgress(userId, trailId);

  const completedStops = existing
    ? [...new Set([...existing.completed_stops, stopId])]
    : [stopId];

  const { data, error } = await supabase
    .from('user_trail_progress')
    .upsert({
      user_id: userId,
      trail_id: trailId,
      completed_stops: completedStops,
      started_at: existing?.started_at ?? new Date().toISOString(),
    }, { onConflict: 'user_id,trail_id' })
    .select()
    .single();

  if (error) {
    console.error('[markStopCompleted]', error);
    return null;
  }
  return data as DbUserTrailProgress;
}

export async function markStopUncompleted(
  userId: string,
  trailId: string,
  stopId: string
): Promise<DbUserTrailProgress | null> {
  const existing = await getTrailProgress(userId, trailId);
  if (!existing) return null;

  const completedStops = existing.completed_stops.filter(id => id !== stopId);

  const { data, error } = await supabase
    .from('user_trail_progress')
    .update({ completed_stops: completedStops })
    .eq('id', existing.id)
    .select()
    .single();

  if (error) return null;
  return data as DbUserTrailProgress;
}

export async function getUserFollowedTrails(userId: string): Promise<FoodTrail[]> {
  const { data, error } = await supabase
    .from('trail_follows')
    .select(`
      trail_id,
      trail:food_trails(*)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error || !data) return [];
  return data.map(d => (d as { trail: FoodTrail }).trail).filter(Boolean);
}

export async function getUserCompletedTrails(userId: string): Promise<FoodTrail[]> {
  const { data, error } = await supabase
    .from('user_trail_progress')
    .select(`
      trail_id,
      trail:food_trails(*)
    `)
    .eq('user_id', userId)
    .eq('is_completed', true)
    .order('completed_at', { ascending: false });

  if (error || !data) return [];
  return data.map(d => (d as { trail: FoodTrail }).trail).filter(Boolean);
}
