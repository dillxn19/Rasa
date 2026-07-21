# Rasa — Referral Tiers & Coin-Unlockable Features (PRD)

Status: **draft for product decision** · Last updated 2026-07-16

## The question
Should premium features be unlocked by **referrals** (invite N friends) or by
**spending Rasa Coins** in the shop?

## Recommendation: do BOTH — a dual-track unlock

Gate each feature behind **either** a referral milestone **or** a coin price.
Whichever the user hits first unlocks it permanently.

Why this is the strongest option:
- **Referrals** drive the growth loop (each unlock is a reason to invite).
- **Coins** give the impatient / non-social user a path, and — critically —
  become the **recurring coin sink** the economy is missing (see
  `economy_and_integrity.md`). This directly rewards *usage* (reviewing earns
  coins) instead of only rewarding *recruiting*.
- Nobody hits a hard wall: social users pay with invites, active users pay with
  engagement. Both behaviours are ones we want.

This is a well-proven model (Dropbox space, Robinhood stock = refer OR pay).

## Proposed unlock ladder

| Feature | Referral unlock | Coin price | Notes |
|---|---|---|---|
| **See friends' ratings** on restaurant cards/pages | 1 referral | 250 🪙 | the core social hook |
| **Average rating per store** (aggregate, not just friends) | 2 referrals | 500 🪙 | light analytics |
| **Monthly Recap** — Beli-style wrapped (top 10 places, top cuisines, cities, dishes, stats to share) | 3 referrals | 800 🪙 | shareable → growth flywheel |

Escalating coin prices keep pace with earn rate (~a few weeks of activity each),
so they're aspirational but reachable — and they pull coins out of circulation.

## Implementation shape (when greenlit)

1. **`entitlements` table** (`user_id`, `feature`, `source: 'referral' | 'coins'`,
   `unlocked_at`). One row per unlocked feature. RLS: owner-read.
2. **`referrals` table** (`referrer_id`, `referred_id`, `activated_at`) — counts
   only when the referred user posts their first review (anti-abuse), mirroring
   the coin first-review signal.
3. **`unlockFeature(userId, feature, source)`** service — for coins, wraps
   `spendCoins`; for referrals, checks the activated-referral count.
4. **`useEntitlement(feature)`** hook — gates UI. Locked features show a teaser
   with the two unlock paths (invite or buy).
5. **Shop "Perks" section** — lists the coin-unlockable features alongside themes
   (a second, more valuable sink than cosmetics).
6. **Monthly Recap screen** — a swipeable, screenshot-friendly story (reuse the
   `ReviewSuccessOverlay` animation vocabulary); "Share to IG" is the growth
   payoff and doubles as free marketing.

## Recommended earn/sink balance
With the current earn rates + 300/day cap, an active weekly reviewer earns
~600–900 🪙/month. Pricing the three unlocks at 250 / 500 / 800 means a dedicated
user unlocks roughly one per month through play — or all three instantly by
inviting 3 friends. That's a healthy tension.

## Open decisions for you
1. Approve the dual-track (refer **OR** buy) model? (My strong recommendation: yes.)
2. Confirm the three features + their referral counts + coin prices above.
3. Should unlocks be **permanent** (recommended) or **subscription-style** (monthly)?
4. Recap cadence: monthly, or also a big annual "Rasa Wrapped"?
