import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Set of restaurant ids the current user has already reviewed ("completed").
 * Shares the `['userReviewedIds', uid]` cache key used elsewhere, so it stays
 * fresh via `invalidateAfterReview`. Used to show a "visited" checkmark and
 * disable saving places you've already been to.
 */
export function useReviewedRestaurantIds(): Set<string> {
  const uid = useAuthStore((s) => s.profile?.id);

  const { data } = useQuery({
    queryKey: ['userReviewedIds', uid],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('reviews')
        .select('restaurant_id')
        .eq('user_id', uid!);
      return new Set((rows ?? []).map((r: { restaurant_id: string }) => r.restaurant_id));
    },
    enabled: !!uid,
    staleTime: 60_000,
  });

  return data ?? new Set<string>();
}
