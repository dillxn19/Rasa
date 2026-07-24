import { supabase } from '@/lib/supabase';
import type { List, ListItem } from '@/types';

export async function getListById(id: string, userId?: string): Promise<List | null> {
  const { data, error } = await supabase
    .from('lists')
    .select(`
      *,
      user:users(*),
      items:list_items(
        *,
        restaurant:restaurants(*)
      )
    `)
    .eq('id', id)
    .single();

  if (error || !data) return null;

  const list = data as List;
  if (list.items) {
    list.items = (list.items as ListItem[]).sort((a, b) => a.position - b.position);
  }

  if (!userId) return list;

  const { data: followData } = await supabase
    .from('list_follows')
    .select('id')
    .eq('user_id', userId)
    .eq('list_id', id)
    .maybeSingle();

  return { ...list, is_following: !!followData };
}

export async function followList(userId: string, listId: string): Promise<void> {
  const { error } = await supabase
    .from('list_follows')
    .insert({ user_id: userId, list_id: listId });
  if (error) throw error;
}

export async function unfollowList(userId: string, listId: string): Promise<void> {
  const { error } = await supabase
    .from('list_follows')
    .delete()
    .eq('user_id', userId)
    .eq('list_id', listId);
  if (error) throw error;
}

export async function createList(userId: string, params: {
  title: string;
  description?: string;
  is_public?: boolean;
  cover_url?: string;
}): Promise<List> {
  const { data, error } = await supabase
    .from('lists')
    .insert({
      user_id: userId,
      title: params.title,
      description: params.description ?? null,
      visibility: (params.is_public ?? true) ? 'public' : 'private',
      cover_photo_url: params.cover_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as List;
}

export async function addRestaurantToList(
  listId: string,
  restaurantId: string,
  addedBy: string,
  note?: string,
): Promise<void> {
  const { data: existing } = await supabase
    .from('list_items')
    .select('position')
    .eq('list_id', listId)
    .order('position', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextPosition = (existing?.position ?? 0) + 1;

  const { error } = await supabase
    .from('list_items')
    .insert({
      list_id: listId,
      restaurant_id: restaurantId,
      added_by: addedBy, // required by NOT NULL + RLS (added_by = auth user)
      note: note ?? null,
      position: nextPosition,
    });
  if (error) throw error;
}

/** Persist a new order for a list's items (position = index in the array). */
export async function reorderListItems(listId: string, orderedRestaurantIds: string[]): Promise<void> {
  await Promise.all(
    orderedRestaurantIds.map((restaurantId, i) =>
      supabase
        .from('list_items')
        .update({ position: i })
        .eq('list_id', listId)
        .eq('restaurant_id', restaurantId),
    ),
  );
}

export async function removeRestaurantFromList(listId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
}

export interface ListWithMembership extends List {
  contains: boolean;
}

/** The user's lists, each flagged with whether it already holds `restaurantId`. */
export async function getUserListsForRestaurant(
  userId: string,
  restaurantId: string,
): Promise<ListWithMembership[]> {
  const { data: lists, error } = await supabase
    .from('lists')
    .select('*, items:list_items(count)')
    .eq('user_id', userId)
    .order('updated_at', { ascending: false });
  if (error) throw error;
  const listRows = (lists ?? []) as List[];
  if (listRows.length === 0) return [];

  const { data: memberRows } = await supabase
    .from('list_items')
    .select('list_id')
    .eq('restaurant_id', restaurantId)
    .in('list_id', listRows.map(l => l.id));
  const inSet = new Set((memberRows ?? []).map((r: { list_id: string }) => r.list_id));

  return listRows.map(l => ({ ...l, contains: inSet.has(l.id) }));
}

export async function getPublicLists(city?: string, limit = 20): Promise<List[]> {
  let query = supabase
    .from('lists')
    .select('*, user:users(id, username, display_name, avatar_url)')
    .eq('is_public', true)
    .order('follower_count', { ascending: false })
    .limit(limit);

  if (city) {
    query = query.eq('city', city);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as List[];
}
