import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/stores/authStore';
import { spendCoins } from './coins';

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
  // Referral-only (3)
  friends_ratings: {
    id: 'friends_ratings', name: "Friends' Ratings", emoji: '👥',
    description: 'See exactly how the people you follow rated every spot.',
    referralsRequired: 1, coinCost: null,
  },
  who_saved: {
    id: 'who_saved', name: 'Who Saved This', emoji: '🔖',
    description: 'See which of your friends saved a place to try.',
    referralsRequired: 2, coinCost: null,
  },
  taste_analytics: {
    id: 'taste_analytics', name: 'Taste Analytics', emoji: '📊',
    description: 'Deep stats on your palate, top cuisines and taste matches.',
    referralsRequired: 3, coinCost: null,
  },
  // Dual-track: referral OR coins (2)
  store_averages: {
    id: 'store_averages', name: 'Community Ratings', emoji: '⭐',
    description: 'Reveal the aggregate community rating on every restaurant.',
    referralsRequired: 1, coinCost: null, // referral-only — cannot be bought with coins
  },
  monthly_recap: {
    id: 'monthly_recap', name: 'Monthly Recap', emoji: '✨',
    description: 'Your shareable wrapped: top places, cuisines, cities and stats.',
    referralsRequired: 1, coinCost: 800,
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

  const isUnlocked = (featureId: string) => {
    const f = FEATURES[featureId];
    if (!f) return true;
    if (unlocked.has(featureId)) return true;
    return referralCount >= f.referralsRequired;
  };

  return { isUnlocked, referralCount, unlocked };
}
