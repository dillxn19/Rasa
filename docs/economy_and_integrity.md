# Rasa — Coin Economy & Leaderboard Integrity (PRD)

Status: **draft for product decision** · Last updated 2026-07-16

This doc exists because two things flagged in review are *product* decisions, not
code bugs: (1) the coin economy needs a defined earn/spend curve so coins don't
inflate into meaninglessness, and (2) the leaderboard's ranking signal shapes
what behaviour the community optimises for.

---

## 1. Coin economy

### Earn rates (implemented, `COIN_AMOUNTS` in `src/services/coins.ts`)
| Action | Coins | Frequency limit |
|---|---|---|
| Review a place | +25 | first review of a place only (edits earn 0) |
| First-ever reviewer of a place | +20 bonus | once per place |
| Maintain weekly streak | +20 | once per week |
| 5-week streak milestone | +100 | every 5 weeks |
| **Daily earn cap** | **300** | resets local midnight (`DAILY_EARN_CAP`) |

Guardrails now in code:
- **Edits don't pay** (`awardReviewRewards` `isNewReview` guard) — kills the
  "edit the same review 100×" exploit.
- **Upsert = one review per (user, place)** — review count ≈ distinct places, so
  you can't inflate by re-reviewing the same spot.
- **Daily cap of 300** — bounds a single day's grind (~11 fresh reviews).

### Sinks (spend) — **this is the gap**
Today the only sink is **profile themes** (150–300 coins each, one-time). Once a
user owns the ~6 themes they want, coins have nowhere to go and the number just
climbs. A healthy economy needs recurring or aspirational sinks. Options:

| Sink | Type | Notes |
|---|---|---|
| Profile themes / banners | one-time | current — finite |
| Seasonal / limited themes (CNY, Raya, Deepavali) | recurring | scarcity + FOMO, fits MY calendar |
| Profile flair (animated avatar ring, name color, badge frames) | one-time-ish | cheap to build, high desirability |
| "Boost" a review/list to the top of a city feed for 24h | recurring | real utility sink, drives content |
| Gift coins to another user | transfer | social, doesn't remove supply though |
| Unlock analytics (your taste stats, who saved your reviews) | one-time | ties into referral-tier ideas |

**Recommendation:** pick **2 recurring sinks** (seasonal cosmetics + review boost)
before adding any new *earners*. Target a rough equilibrium where an active weekly
user can afford ~1 desirable cosmetic/month, not 5.

### Open decisions for you
1. Confirm the daily cap value (300 now — raise/lower?).
2. Approve at least one recurring sink so balances don't run away.
3. Decide whether coins are ever purchasable for real money (monetisation) or
   strictly earned (keeps it a pure engagement currency).

---

## 2. Leaderboard integrity

### Current ranking
`getLeaderboard` / `getFriendsLeaderboard` rank by **review count** (all-time uses
`users.total_reviews`; weekly/monthly count public reviews in the window).

### Why it's *already* reasonably safe
- Reviews upsert per place, so count ≈ **distinct places reviewed** — you can't
  pad it by spamming one restaurant.
- Only **public, rated** reviews count.

### The remaining risk
A pure-count board still rewards *volume over quality* — a culture of low-effort
one-tap ratings can form. This is a values decision: Beli is deliberately
count-based (simple, legible). Rasa can differentiate on quality.

### Options
1. **Keep count** (status quo) — simplest, most legible, matches Beli. Lowest risk.
2. **Quality-weighted score** — weight each review by signals: has photo (+), has
   text over N chars (+), likes received (+). Ranks trusted tastemakers higher.
   Cost: heavier queries (must read per-review fields), less legible number.
3. **Hybrid** — rank by count but gate eligibility (e.g. a review only counts
   toward the board if it has a rating *and* (photo *or* ≥ 40 chars of text)).
   Cheap, keeps a clean "reviews" number, quietly raises the floor.

**Recommendation: option 3 (hybrid gate).** It preserves the simple "N reviews"
UX while removing the incentive for empty ratings, at almost no query cost. Ship
it before a leaderboard culture forms — changing ranking later feels unfair to
users who climbed under the old rules.

### Open decisions for you
1. Count vs. quality-weighted vs. hybrid?
2. If hybrid: what's the minimum bar for a review to "count"?
