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

// Coins paid per activated referral — mirrors the record/activate RPC bonus.
export const COINS_PER_ACTIVATION = 200;

export interface ReferredUser {
  id: string;
  display_name: string;
  username: string;
  avatar_url: string | null;
  joined_at: string;        // when they were referred (referrals.created_at)
  activated: boolean;       // has posted their first review
  activated_at: string | null;
}

export interface ReferralAnalytics extends ReferralStats {
  activationRate: number;   // 0–1
  coinsEarned: number;      // from activated referrals
  last7: number;            // referrals in the last 7 days
  people: ReferredUser[];   // newest first
}

/**
 * Full referral breakdown for the invite/analytics screen: headline stats plus
 * the list of people you've referred (with their join date + activation status).
 */
export async function getReferralAnalytics(userId: string): Promise<ReferralAnalytics> {
  // Two-step (not an embedded join) so we don't depend on the FK constraint name
  // — referrals has two FKs to users, which makes embedding fragile.
  const { data: refRows } = await supabase
    .from('referrals')
    .select('referred_id, created_at, activated_at')
    .eq('referrer_id', userId)
    .order('created_at', { ascending: false });

  const rows = (refRows ?? []) as { referred_id: string; created_at: string; activated_at: string | null }[];
  const now = Date.now();
  const WEEK = 7 * 24 * 60 * 60 * 1000;

  const ids = rows.map(r => r.referred_id);
  const { data: userRows } = ids.length
    ? await supabase.from('users').select('id, display_name, username, avatar_url').in('id', ids)
    : { data: [] as any[] };
  const byId = new Map((userRows ?? []).map((u: any) => [u.id, u]));

  const people: ReferredUser[] = rows.map(r => {
    const u = byId.get(r.referred_id);
    return {
      id: r.referred_id,
      display_name: u?.display_name ?? 'New foodie',
      username: u?.username ?? '',
      avatar_url: u?.avatar_url ?? null,
      joined_at: r.created_at,
      activated: r.activated_at != null,
      activated_at: r.activated_at,
    };
  });

  const total = rows.length;
  const activated = people.filter(p => p.activated).length;
  const last7 = rows.filter(r => r.created_at && now - new Date(r.created_at).getTime() < WEEK).length;

  return {
    total,
    activated,
    activationRate: total > 0 ? activated / total : 0,
    coinsEarned: activated * COINS_PER_ACTIVATION,
    last7,
    people,
  };
}
