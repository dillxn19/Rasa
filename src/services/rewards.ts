import { awardCoins, COIN_AMOUNTS, DAILY_EARN_CAP, getCoinsEarnedToday } from './coins';
import { updateReviewStreak } from './users';
import { getRestaurantById } from './restaurants';
import { activateReferral } from './referrals';
import { supabase } from '@/lib/supabase';

/**
 * Has this user ALREADY earned the first-review bonus for this restaurant? The
 * coin transaction persists even if they later delete the review, so this stops
 * the "delete + re-add to re-earn the +20 bonus" exploit. Matches the coin ledger
 * by type + the restaurant name embedded in the description.
 */
async function hasEarnedFirstReviewBonus(userId: string, restaurantName?: string): Promise<boolean> {
  if (!restaurantName) return false;
  const { count } = await supabase
    .from('coin_transactions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('type', 'first_restaurant_review')
    .ilike('description', `%${restaurantName}%`);
  return (count ?? 0) > 0;
}

export interface ReviewRewards {
  /** Total coins earned from this review (review + first-review bonus + streak). */
  coinsEarned: number;
  /** Current weekly streak length after this review, or null if unavailable. */
  streakWeeks: number | null;
  /** True when this review opened a new weekly streak slot. */
  isNewWeek: boolean;
  /** True when this review hit a 5-week milestone. */
  isMilestone: boolean;
  /** True when the user was the first to review this restaurant. */
  isFirstReview: boolean;
  /** True when no coins were awarded because this was an edit, not a new review. */
  isEdit: boolean;
  /** True when review coins were withheld because the daily earn cap was hit. */
  cappedDaily: boolean;
}

/**
 * Awards all coins tied to submitting a review and advances the weekly streak.
 * Returns a summary so the UI can show exactly what the user earned.
 *
 * Anti-farming: coins + streak are ONLY granted for a genuinely new review.
 * Re-submitting/editing an existing review (an upsert) grants nothing, so users
 * can't grind coins by editing the same review repeatedly.
 *
 * Note: `updateReviewStreak` awards the streak/milestone coins itself; this
 * function only *reads* those amounts into the total so we never double-award.
 */
export async function awardReviewRewards(
  userId: string,
  restaurantId: string,
  restaurantName?: string,
  opts: { isNewReview?: boolean } = {},
): Promise<ReviewRewards> {
  const isNewReview = opts.isNewReview ?? true;

  if (!isNewReview) {
    return {
      coinsEarned: 0,
      streakWeeks: null,
      isNewWeek: false,
      isMilestone: false,
      isFirstReview: false,
      isEdit: true,
      cappedDaily: false,
    };
  }

  // Daily earn cap: the farmable coins (review + first-review) stop once the user
  // has earned DAILY_EARN_CAP today. Streak/milestone coins are naturally rare
  // (once per week) so they still land even at the cap.
  const earnedToday = await getCoinsEarnedToday(userId).catch(() => 0);
  const atCap = earnedToday >= DAILY_EARN_CAP;

  let coinsEarned = 0;
  if (!atCap) {
    coinsEarned += COIN_AMOUNTS.review;
    await awardCoins(userId, COIN_AMOUNTS.review, 'review', `Reviewed ${restaurantName ?? 'a restaurant'}`).catch(() => {});
  }

  // First-ever review of this restaurant earns a discovery bonus. The DB trigger
  // increments total_reviews on insert, so <= 1 means this user was first.
  const isFirstReview = await getRestaurantById(restaurantId)
    .then(r => (r?.total_reviews ?? 0) <= 1)
    .catch(() => false);

  // ...but only pay it if they haven't ALREADY earned it here (anti delete+re-add).
  const alreadyGotFirst = await hasEarnedFirstReviewBonus(userId, restaurantName).catch(() => false);

  if (isFirstReview && !alreadyGotFirst && !atCap) {
    coinsEarned += COIN_AMOUNTS.first_restaurant_review;
    await awardCoins(
      userId,
      COIN_AMOUNTS.first_restaurant_review,
      'first_restaurant_review',
      `First review of ${restaurantName ?? 'a restaurant'}`,
    ).catch(() => {});
  }

  const streak = await updateReviewStreak(userId).catch(() => null);
  if (streak?.newWeek) coinsEarned += COIN_AMOUNTS.streak_week;
  if (streak?.milestone) coinsEarned += COIN_AMOUNTS.streak_milestone_5;

  // If this user was referred, their review activity activates the referral and
  // pays their referrer. The RPC is idempotent, so calling it each review is safe.
  activateReferral(userId).catch(() => {});

  return {
    coinsEarned,
    streakWeeks: streak?.weeks ?? null,
    isNewWeek: streak?.newWeek ?? false,
    isMilestone: streak?.milestone ?? false,
    isFirstReview: isFirstReview && !alreadyGotFirst,
    isEdit: false,
    cappedDaily: atCap,
  };
}
