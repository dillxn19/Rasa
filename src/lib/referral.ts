import { Share, InteractionManager } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Linking from 'expo-linking';

const PENDING_REFERRER_KEY = 'rasa_pending_referrer';
const WEB_BASE = 'https://rasa.my';

/**
 * Public web link that carries the referral (opens the app if installed).
 * `ref` accepts a referral code (preferred) or a username — record_referral
 * resolves either. Falls back to username when a code isn't available yet.
 */
export function buildInviteLink(ref: string): string {
  return `${WEB_BASE}/join?ref=${encodeURIComponent(ref)}`;
}

/**
 * Opens the native share sheet with the user's personal invite link + code.
 *
 * The share sheet is presented AFTER interactions settle (and a short buffer),
 * because callers invoke this right as a modal (settings sheet, feature-gate
 * popup, etc.) is dismissing — presenting the OS share sheet over a modal that's
 * still mid-transition deadlocks/crashes on iOS. Deferring here keeps every
 * caller safe without each one having to time it.
 */
export function shareInvite(ref: string): void {
  const link = buildInviteLink(ref);
  const message =
    `Join Rasa 🍜 — a food social app for Malaysia (think Beli, but for our makan).\n` +
    `Rate places, follow friends and find your next meal.\n` +
    `Use my code ${ref.toUpperCase()} or tap:\n${link}`;
  InteractionManager.runAfterInteractions(() => {
    setTimeout(() => { Share.share({ message }).catch(() => {}); }, 250);
  });
}

/** Copy the referral code to the clipboard. */
export async function copyReferralCode(code: string): Promise<void> {
  await Clipboard.setStringAsync(code.toUpperCase());
}

// ── Pending referrer (captured from a deep link before signup) ──

export async function setPendingReferrer(username: string): Promise<void> {
  try {
    await AsyncStorage.setItem(PENDING_REFERRER_KEY, username.toLowerCase());
  } catch {
    /* non-fatal */
  }
}

export async function getPendingReferrer(): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(PENDING_REFERRER_KEY);
  } catch {
    return null;
  }
}

export async function clearPendingReferrer(): Promise<void> {
  try {
    await AsyncStorage.removeItem(PENDING_REFERRER_KEY);
  } catch {
    /* non-fatal */
  }
}

/**
 * Extracts a `ref` username from an incoming deep/universal link, e.g.
 * `rasa://join?ref=alice` or `https://rasa.my/join?ref=alice`.
 */
export function parseReferrerFromUrl(url: string | null): string | null {
  if (!url) return null;
  try {
    const { queryParams } = Linking.parse(url);
    const ref = queryParams?.ref;
    if (typeof ref === 'string' && ref.trim().length > 0) return ref.trim().toLowerCase();
  } catch {
    /* ignore malformed */
  }
  return null;
}
