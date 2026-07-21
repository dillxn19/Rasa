import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';

/**
 * Set of restaurant ids the current user has bookmarked ("want to try").
 * Lets any RestaurantCard reflect the real saved state (the list/category
 * queries don't join saved_restaurants). Invalidate `['userSavedIds', uid]`
 * after saving/unsaving to keep it fresh.
 */
export function useSavedRestaurantIds(): Set<string> {
  const uid = useAuthStore((s) => s.profile?.id);

  const { data } = useQuery({
    queryKey: ['userSavedIds', uid],
    queryFn: async () => {
      const { data: rows } = await supabase
        .from('saved_restaurants')
        .select('restaurant_id')
        .eq('user_id', uid!);
      return new Set((rows ?? []).map((r: { restaurant_id: string }) => r.restaurant_id));
    },
    enabled: !!uid,
    staleTime: 60_000,
  });

  return data ?? new Set<string>();
}
