import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { queryKeys } from '@/lib/queryClient';
import type { User } from '@/types';

/**
 * Makes the signed-in user's profile a React Query resource and mirrors it into
 * the auth store. This is the canonical way to keep `profile` fresh:
 *
 *   - Zustand still holds `profile` (so the hundreds of `useAuthStore().profile`
 *     call sites keep working with zero churn), but it is now *downstream* of
 *     React Query rather than a second independent source of truth.
 *   - Any mutation that changes the current user's counts can simply call
 *     `qc.invalidateQueries({ queryKey: queryKeys.currentUser() })` (see
 *     `invalidateAfterReview`) and every screen updates — no per-screen refresh.
 *
 * Mount this once, high in the authenticated tree (the tabs layout).
 */
export function useCurrentUserSync() {
  const authId = useAuthStore(s => s.supabaseUser?.id);
  const setProfile = useAuthStore(s => s.setProfile);

  const { data } = useQuery({
    queryKey: queryKeys.currentUser(),
    queryFn: async (): Promise<User | null> => {
      const { data: row } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', authId!)
        .single();
      return (row ?? null) as User | null;
    },
    enabled: !!authId,
    staleTime: 1000 * 30,
  });

  useEffect(() => {
    if (data) setProfile(data);
  }, [data, setProfile]);
}
