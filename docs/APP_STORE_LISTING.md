# Rasa — App Store / Play Store Listing (draft)

Draft copy + submission metadata for launch. Anything marked **[👤]** needs you to
supply an asset, URL, or dashboard entry — everything else is ready to paste.

---

## App name / title
- **iOS App Store title** (30 char max): `Rasa: Malaysia Food & Makan`
- **Play Store title** (30 char max): `Rasa — Malaysia Food & Makan`
- **Subtitle (iOS, 30 char)**: `Reviews, halal & hawker finds`
- **Promotional text (iOS, 170 char, editable anytime)**:
  `Discover where Malaysia really eats — from mamak to fine dining. Rate spots, follow friends, find halal & hawker gems near you.`

## Keywords (iOS keyword field, 100 char, comma-separated, NO spaces)
```
malaysia,food,restaurant,review,halal,makan,hawker,mamak,cafe,foodie,beli,diary,recommend,kopitiam
```
> iOS: don't repeat words already in the title/subtitle (wasted characters). Play
> Store has no keyword field — keywords come from the description instead.

## Short description (Play Store, 80 char max)
`Malaysia's food diary. Rate restaurants, find halal & hawker gems, follow friends.`

## Full description (both stores)
```
Rasa is where Malaysia decides what to eat.

Think of it as your food diary and social feed rolled into one — rate every
place you visit, keep a personal ranking of your favourites, and see where your
friends are eating right now.

WHY RASA
• Rank, don't just rate — build your personal Top list of every makan spot.
• Halal & Muslim-friendly filters on every screen.
• From hawker stalls and mamak to kopitiam, cafes and fine dining.
• Follow friends and foodies — a feed of real reviews, not ads.
• Find great food near you, sorted by distance or top-rated.
• Dish-first discovery — search "nasi lemak" or "cendol", not just restaurants.
• Earn Rasa Coins, keep weekly streaks, unlock your monthly food recap.

Prices in MYR. Built for KL, PJ, Penang, JB, Subang, Shah Alam and beyond.

Makan on. 🍜
```

## Category
- Primary: **Food & Drink**
- Secondary (Play): **Lifestyle**

## Age rating
- **12+ / Teen** — user-generated content (reviews, photos, comments) + social
  features. Answer the questionnaire honestly: UGC yes, no violence/gambling.

---

## URLs required by both stores — **[👤]**
| Field | Value |
|---|---|
| Privacy policy URL | **[👤]** public web page — e.g. `https://rasamalaysia.org/privacy` (must host the same content as the in-app `app/legal/privacy.tsx`) |
| Support URL | **[👤]** e.g. `https://rasamalaysia.org/support` or the in-app `app/support.tsx` content on the web |
| Marketing URL (optional) | `https://rasamalaysia.org` |

> The in-app screens exist (`/legal/privacy`, `/legal/terms`, `/support`) but the
> stores need a **public web URL**. Mirror the copy onto the website before submitting.

---

## Privacy nutrition labels / Data Safety — **[👤 to enter, map below is ready]**

Declare these based on what the app actually does. "Linked to identity" = tied to
the user's account.

| Data type | Collected? | Linked to you? | Used for tracking?* | Purpose |
|---|---|---|---|---|
| Name | Yes | Yes | No | Account, social profile |
| Email address | Yes | Yes | No | Account, auth |
| Photos (food/profile) | Yes | Yes | No | App content |
| User content (reviews, comments, lists) | Yes | Yes | No | App functionality |
| Coarse/approximate location | Yes (opt-in) | No | No | Nearby restaurants |
| Precise location | Yes (opt-in) | No | No | Nearby restaurants / distance |
| Product interaction / usage data | Yes | No | No | Analytics (PostHog) |
| Crash data / diagnostics | Yes | No | No | Diagnostics (Sentry) |
| Payment info | **No** | — | — | — |
| Contacts | **No** | — | — | — |

\* **App Tracking Transparency (ATT):** we do **not** track users across other
companies' apps/websites and do not share data with data brokers, so the answer
to "used for tracking" is **No** across the board. This means **no ATT prompt is
required** as currently built (PostHog/Sentry are first-party product analytics).
If you later add ad-network SDKs or the Facebook SDK, this changes — you'd need
`expo-tracking-transparency` + an ATT prompt.

Third-party processors to list where asked: Supabase, Algolia, Google Places,
PostHog, Sentry, Resend. (These match `app/legal/privacy.tsx`.)

---

## Screenshots — **[👤]**
Required sizes (use the simulator + a device frame tool):
- iPhone 6.7" (1290×2796) — **required**, 3–5 shots
- iPhone 6.5" (1284×2778) — optional if 6.7 provided
- iPad — **not required** (`supportsTablet: false`)
- Android phone (min 2, 1080×1920 or device native)

Suggested shots: (1) Home feed, (2) Restaurant profile w/ halal badge,
(3) Explore — Top Rated grid, (4) Your ranked list / profile, (5) Monthly recap.

## App icon — **[👤 BLOCKER]**
`assets/images/icon.png` is still a ~4.5KB placeholder. Need a real 1024×1024
icon (no alpha, no rounded corners — the store rounds it). Apple rejects generic
placeholder icons. Once delivered, `app.json` already points at it — no code change.

---

## Review notes (App Store Connect "Notes" field) — recommended
```
Rasa is invite-only at launch (referral code required to sign up). Demo access
for review: use referral code <CODE> and test account <email/pw>. Halal filters,
reviews, and social feed are all functional. Location is optional and only used
to sort nearby restaurants.
```
> **[👤]** Provide a demo account + a valid referral code, or temporarily flip the
> signup gate off (`UPDATE app_config SET bool_value=false WHERE key='signup_requires_referral';`)
> during review — otherwise reviewers hit the invite wall and reject.
