import { useEffect } from 'react';
import * as Linking from 'expo-linking';
import { parseReferrerFromUrl, setPendingReferrer } from '@/lib/referral';

/**
 * Captures a `?ref=<username>` from the launch URL or any incoming deep link and
 * stashes it until the user finishes onboarding (see the onboarding screen).
 * Mounted once at the root.
 */
export function useReferralCapture() {
  useEffect(() => {
    let mounted = true;

    Linking.getInitialURL()
      .then(url => {
        const ref = parseReferrerFromUrl(url);
        if (mounted && ref) setPendingReferrer(ref);
      })
      .catch(() => {});

    const sub = Linking.addEventListener('url', ({ url }) => {
      const ref = parseReferrerFromUrl(url);
      if (ref) setPendingReferrer(ref);
    });

    return () => {
      mounted = false;
      sub.remove();
    };
  }, []);
}
