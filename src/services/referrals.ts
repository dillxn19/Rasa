import { supabase } from '@/lib/supabase';

/**
 * Records a referral after the referred user finishes onboarding. Resolves the
 * referrer by username server-side and pays the signup bonus. Idempotent and
 * anti-abuse rules live in the `record_referral` SECURITY DEFINER function.
 */
export async function recordReferral(referrerUsername: string, referredId: string): Promise<void> {
  await supabase.rpc('record_referral', {
    p_referrer_username: referrerUsername,
    p_referred_id: referredId,
  });
}

/**
 * Activates the current user's referral (if any) — call after their first
 * review. No-ops when there is no referral row or it's already activated.
 */
export async function activateReferral(referredId: string): Promise<void> {
  await supabase.rpc('activate_referral', { p_referred_id: referredId });
}

export interface ReferralStats {
  total: number;
  activated: number;
}

/** Total referrals made and how many have posted their first review. */
export async function getReferralStats(userId: string): Promise<ReferralStats> {
  const { data } = await supabase
    .from('referrals')
    .select('activated_at')
    .eq('referrer_id', userId);
  const rows = data ?? [];
  return {
    total: rows.length,
    activated: rows.filter((r: { activated_at: string | null }) => r.activated_at != null).length,
  };
}
