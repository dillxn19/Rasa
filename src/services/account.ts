import { supabase } from '@/lib/supabase';

/**
 * Permanently delete the signed-in user's account and all their content.
 * Calls the `delete-account` Edge Function (service role removes the auth.users
 * row → cascades to every user-owned table). The caller should sign out and
 * clear local state afterwards.
 */
export async function deleteAccount(): Promise<void> {
  const { data, error } = await supabase.functions.invoke('delete-account', {
    body: {},
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
}
