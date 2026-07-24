import PostHog from 'posthog-react-native';

/**
 * Thin analytics wrapper around PostHog. Completely inert until an API key is
 * provided via EXPO_PUBLIC_POSTHOG_API_KEY — so the app runs and ships fine
 * with no account configured; wiring the key later "turns it on" with zero
 * code changes. Never throws; analytics must never break a user flow.
 */

const API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com';

let client: PostHog | null = null;

export function initAnalytics(): void {
  if (client || !API_KEY || API_KEY.startsWith('your-')) return;
  try {
    client = new PostHog(API_KEY, {
      host: HOST,
      // Manual screen tracking; we send explicit events below.
      enableSessionReplay: false,
    });
  } catch {
    client = null;
  }
}

/** Well-known events — keep names stable so funnels don't fragment. */
export type AnalyticsEvent =
  | 'signup_completed'
  | 'onboarding_completed'
  | 'review_submitted'
  | 'referral_shared'
  | 'referral_code_copied'
  | 'restaurant_viewed'
  | 'search_performed'
  | 'user_blocked'
  | 'content_reported'
  | 'account_deleted';

export function track(event: AnalyticsEvent, props?: Record<string, unknown>): void {
  try {
    client?.capture(event, props);
  } catch {
    /* never throw from analytics */
  }
}

/** Associate subsequent events with a user (called once profile is known). */
export function identifyUser(userId: string, props?: Record<string, unknown>): void {
  try {
    client?.identify(userId, props);
  } catch {
    /* noop */
  }
}

/** Clear identity on sign-out / account switch so events don't bleed across users. */
export function resetAnalytics(): void {
  try {
    client?.reset();
  } catch {
    /* noop */
  }
}
