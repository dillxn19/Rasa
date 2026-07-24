import { supabase } from '@/lib/supabase';

export interface RankBucketItem {
  reviewId: string;
  restaurantName: string;
  restaurantId: string;
}

/**
 * The user's other reviews at the same star rating, best→worst by rank_score.
 * This is the "tier" the newly-rated place is being slotted into.
 */
export async function getRankBucket(
  userId: string,
  rating: number,
  excludeReviewId: string,
): Promise<RankBucketItem[]> {
  const { data, error } = await supabase
    .from('reviews')
    .select('id, restaurant_id, rank_score, restaurant:restaurants!restaurant_id ( name )')
    .eq('user_id', userId)
    .eq('rating', rating)
    .neq('id', excludeReviewId)
    .order('rank_score', { ascending: false, nullsFirst: false });
  if (error) return [];
  return (data ?? []).map((r: any) => ({
    reviewId: r.id,
    restaurantId: r.restaurant_id,
    restaurantName: r.restaurant?.name ?? 'a place',
  }));
}

/** Persist the new top→bottom order for one star tier (interpolates scores). */
export async function reorderReviews(
  userId: string,
  rating: number,
  orderedReviewIds: string[],
): Promise<void> {
  await supabase.rpc('reorder_reviews', {
    p_user_id: userId,
    p_rating: rating,
    p_ordered_ids: orderedReviewIds,
  });
}
