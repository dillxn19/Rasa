import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { spendCoins } from './coins';

// Founder/admin usernames — always get full access to every gated feature and
// unlockable, regardless of referrals/coins/DB flags.
export const ADMIN_USERNAMES = new Set<string>(['dillxn_19']);

export interface FeatureDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  /** Referrals required to unlock (activated referrals). */
  referralsRequired: number;
  /** Coin cost, or null if this feature is REFERRAL-ONLY. */
  coinCost: number | null;
}

/**
 * Gated premium features. Three are referral-ONLY (coinCost null); two are
 * dual-track (referral OR coins). See docs/referrals_and_unlocks.md.
 */
export const FEATURES: Record<string, FeatureDef> = {
  // Referral-only — each costs 1 referral, unlocked INDEPENDENTLY.
  friends_ratings: {
    id: 'friends_ratings', name: "Friends' Ratings", emoji: '👥',
    description: 'See exactly how the people you follow rated every spot.',
    referralsRequired: 1, coinCost: null,
  },
  who_saved: {
    id: 'who_saved', name: 'Who Saved This', emoji: '🔖',
    description: 'See which of your friends saved a place to try.',
    referralsRequired: 1, coinCost: null,
  },
  store_averages: {
    id: 'store_averages', name: 'Community Ratings', emoji: '⭐',
    description: 'Reveal the aggregate community rating on every restaurant.',
    referralsRequired: 1, coinCost: null, // referral-only — cannot be bought with coins
  },
  // Dual-track: 1 referral OR coins.
  taste_analytics: {
    id: 'taste_analytics', name: 'Food Passport', emoji: '📖',
    description: 'Your Food Passport: stamps, badges, streaks, plus deep stats on your palate, top cuisines and taste matches.',
    referralsRequired: 1, coinCost: 1000,
  },
  monthly_recap: {
    id: 'monthly_recap', name: 'Monthly Recap', emoji: '✨',
    description: 'Your shareable wrapped: top places, cuisines, cities and stats.',
    referralsRequired: 1, coinCost: 1500,
  },
};

export async function getActivatedReferralCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('referrals')
    .select('id', { count: 'exact', head: true })
    .eq('referrer_id', userId)
    .not('activated_at', 'is', null);
  return count ?? 0;
}

export async function getUnlockedFeatures(userId: string): Promise<Set<string>> {
  const { data } = await supabase
    .from('feature_unlocks')
    .select('feature')
    .eq('user_id', userId);
  return new Set((data ?? []).map((r: { feature: string }) => r.feature));
}

/** How many referral-funded unlocks the user has already spent. */
export async function getReferralUnlockCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from('feature_unlocks')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('source', 'referral');
  return count ?? 0;
}

/**
 * Spend ONE referral credit to unlock a single feature. Each activated referral
 * is a credit; unlocking is independent (referring one friend unlocks one
 * feature, not all). The UNIQUE(user_id, feature) row prevents double-spends.
 */
export async function unlockWithReferral(
  userId: string,
  feature: FeatureDef,
): Promise<{ success: boolean; message: string }> {
  const { error } = await supabase
    .from('feature_unlocks')
    .insert({ user_id: userId, feature: feature.id, source: 'referral' });
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    return { success: false, message: 'Could not unlock. Try again.' };
  }
  return { success: true, message: `${feature.name} unlocked!` };
}

/** Unlock a dual-track feature by spending coins. Returns success + balance. */
export async function unlockWithCoins(
  userId: string,
  feature: FeatureDef,
): Promise<{ success: boolean; message: string; newBalance: number }> {
  if (feature.coinCost == null) {
    return { success: false, message: 'This feature can only be unlocked by referring friends.', newBalance: 0 };
  }
  const spend = await spendCoins(userId, feature.coinCost, 'spend_theme', `Unlocked ${feature.name}`);
  if (!spend.success) {
    return { success: false, message: `Not enough coins. Need ${feature.coinCost} 🪙.`, newBalance: spend.newBalance };
  }
  await supabase.from('feature_unlocks').insert({ user_id: userId, feature: feature.id, source: 'coins' }).then(() => {});
  return { success: true, message: `${feature.name} unlocked!`, newBalance: spend.newBalance };
}

/**
 * Access state for gated features. A feature is accessible when the user has
 * enough activated referrals OR has an explicit unlock row. Fails safe to
 * "locked" (e.g. before migration 008 is run).
 */
export function useFeatureAccess() {
  const uid = useAuthStore((s) => s.profile?.id);
  // Ambassadors AND admins get full access to every gated feature. Admins are
  // pinned by username in code so the founder always has everything, regardless
  // of the DB is_ambassador flag.
  const isAmbassador = useAuthStore((s) => !!s.profile?.is_ambassador);
  const username = useAuthStore((s) => s.profile?.username);
  const isAdmin = !!username && ADMIN_USERNAMES.has(username.toLowerCase());
  const fullAccess = isAmbassador || isAdmin;

  const { data: referralCount = 0 } = useQuery({
    queryKey: ['referralCount', uid],
    queryFn: () => getActivatedReferralCount(uid!).catch(() => 0),
    enabled: !!uid,
    staleTime: 1000 * 60,
  });

  const { data: unlocked = new Set<string>() } = useQuery({
    queryKey: ['featureUnlocks', uid],
    queryFn: () => getUnlockedFeatures(uid!).catch(() => new Set<string>()),
    enabled: !!uid,
    staleTime: 1000 * 60,
  });

  const { data: referralUnlockCount = 0 } = useQuery({
    queryKey: ['referralUnlockCount', uid],
    queryFn: () => getReferralUnlockCount(uid!).catch(() => 0),
    enabled: !!uid,
    staleTime: 1000 * 60,
  });

  // Referral credits still available to spend (each unlock costs one).
  const referralCredits = Math.max(0, referralCount - referralUnlockCount);

  // A feature is unlocked ONLY via an explicit unlock (referral credit or coins)
  // or for ambassadors — NOT automatically at a referral threshold, so one
  // referral doesn't unlock everything.
  const isUnlocked = (featureId: string) => {
    if (fullAccess) return true;
    const f = FEATURES[featureId];
    if (!f) return true;
    return unlocked.has(featureId);
  };

  return { isUnlocked, referralCount, referralCredits, unlocked, isAmbassador: fullAccess, isAdmin };
}
