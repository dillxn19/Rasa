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
      is_public: params.is_public ?? true,
      cover_url: params.cover_url ?? null,
    })
    .select()
    .single();
  if (error) throw error;
  return data as List;
}

export async function addRestaurantToList(listId: string, restaurantId: string, note?: string): Promise<void> {
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
      note: note ?? null,
      position: nextPosition,
    });
  if (error) throw error;
}

export async function removeRestaurantFromList(listId: string, restaurantId: string): Promise<void> {
  const { error } = await supabase
    .from('list_items')
    .delete()
    .eq('list_id', listId)
    .eq('restaurant_id', restaurantId);
  if (error) throw error;
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
