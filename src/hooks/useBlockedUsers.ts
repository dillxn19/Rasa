import { useQuery } from '@tanstack/react-query';
import { getBlockedUserIds } from '@/services/moderation';
import { useAuthStore } from '@/stores/authStore';

/**
 * IDs of users the current user has blocked. Used to filter them out of feeds,
 * search, comments and discovery. Returns a stable Set for cheap `.has()` checks.
 * Fails safe to empty (blocks nothing) before migration 013 runs.
 */
export function useBlockedUserIds(): Set<string> {
  const uid = useAuthStore(s => s.profile?.id);
  const { data } = useQuery({
    queryKey: ['blockedIds', uid],
    queryFn: () => getBlockedUserIds(uid!),
    enabled: !!uid,
    staleTime: 60_000,
  });
  return new Set(data ?? []);
}
