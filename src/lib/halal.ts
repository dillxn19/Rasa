// Halal browsing in Malaysia includes BOTH certified places and muslim-friendly
// ones (no pork / no alcohol). Certified-only is far too sparse — especially for
// Google-sourced places, which are never auto-certified — so a halal user would
// see a near-empty screen. Treating "halal" as certified-OR-muslim-friendly keeps
// the experience as full as everyone else's while still excluding non-halal spots.
export const HALAL_DIETARY_TAGS = ['halal_certified', 'muslim_friendly'] as const;

/** True if a restaurant's dietary_options mark it halal-certified or muslim-friendly. */
export function isHalalFriendly(dietary?: string[] | null): boolean {
  if (!dietary) return false;
  return dietary.some(d => d === 'halal_certified' || d === 'muslim_friendly');
}
