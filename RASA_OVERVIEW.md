# Rasa — Product & Business Overview

*A briefing document for building a go-to-market / social-media growth strategy. Written for a marketing & business audience (non-technical).*

---

## 1. The one-liner

**Rasa is Malaysia's social food discovery app — think "Beli for Malaysia."** It's where food lovers rank every place they eat, follow friends' taste, and discover the best hawker stalls, mamaks, cafés and restaurants near them — from nasi lemak to fine dining.

The name **Rasa** means *taste* / *feeling* in Malay — the emotional core of the product.

---

## 2. The problem we solve

Malaysians are obsessed with food, but food discovery today is broken:

- **Google Maps reviews are noisy and gamed** — 4.2 stars tells you nothing about whether *you'll* like it.
- **Instagram is aspirational, not useful** — you see a pretty plate but can't find it, rank it, or trust it.
- **Word-of-mouth doesn't scale** — the best recommendations still come from that one friend with great taste, trapped in WhatsApp chats.
- **No single home for Malaysia's food culture** — hawker stalls, kopitiams, mamaks and night markets are underserved by Western-built apps.

Rasa turns your friends (and people with taste like yours) into your personal food-recommendation engine.

---

## 3. Who it's for

- **Primary:** Urban Malaysian food lovers, 18–35, in the Klang Valley (KL, PJ, Subang, Shah Alam) — the launch market.
- **Beachhead:** University students on KL-area campuses (Sunway, Monash, Taylor's, UM, APU, etc.) — dense, social, high-frequency eaters, natural early adopters. Campus leaderboards are built specifically for this.
- **Expansion:** Penang, JB, and the broader Malaysian market; then regional SEA.

---

## 4. How it works (the core loop)

1. **Rank, don't just rate.** When you review a place, Rasa doesn't just ask for stars — it asks you to *compare* it against places you've already been ("Which did you like more?"). This builds a personal, ordered ranking of everywhere you've eaten. This is the addictive, Beli-style mechanic.
2. **Build your food identity.** Your profile becomes a living record of your taste — your rankings, your "Taste DNA," your streaks, your food passport and badges.
3. **Follow taste, not just people.** Follow friends and food lovers; your home feed fills with what they're eating and loving. Rasa also computes **taste-match %** between you and others.
4. **Discover with trust.** Explore by category (Hawker, Mamak, Café, Kopitiam, Fine Dining…) or by iconic dish (Nasi Lemak, Char Kway Teow, Roti Canai…), sorted **Near Me** or **Top Rated**. Recommendations are personalised to your taste and location.
5. **Come back.** Streaks, leaderboards, badges, notifications, and a monthly recap keep you engaged.

---

## 5. Key features (what's built today)

### Discovery & search
- **Explore** by food category *and* by iconic Malaysian dish — unified, consistent card layouts.
- **Near Me / Top Rated** sorting on every category and dish view.
- **Hybrid search** — searches Rasa's own database first, then falls back to Google Places, so you can find *any* restaurant in Malaysia even before the community has reviewed it (no dead ends).
- **Personalised recommendations** — a "For You" engine based on your taste graph, plus a Nearby mode with distance filters.
- **Time-aware discovery** — the app adapts suggestions to meal times (breakfast/lunch/tea/dinner/supper).

### Social & identity
- **Ranked reviews** with photos — the signature "compare to rank" flow.
- **Follow / followers**, friend activity feed, and **taste-match scoring**.
- **Food Passport & badges**, review **streaks**, and a **Taste DNA** profile.
- **Custom Lists** (Spotify-playlist-style) — curate and share collections of places; reorderable.
- **Likes & comments** on reviews.

### Malaysian-first design
- **Halal-critical UX** — clear Halal-certified / Muslim-friendly indicators everywhere (non-negotiable for this market).
- Malaysian food categories built in: hawker, mamak, kopitiam, food court, night market, fine dining, café.
- Prices in **MYR**; cities: KL, PJ, Penang, JB, Subang, Shah Alam.

### Engagement & retention
- **City, Friends, and Campus leaderboards** — rank against your city or your university.
- **Monthly Recap** — a Spotify-Wrapped-style, shareable story of your food year (top spots, stats, photo collage). *Gated behind 10 ranked places to drive activation.*
- **Notifications** for social activity.

### Trust & quality
- **Honest ratings** — Rasa deliberately does **not** show fake or borrowed aggregate star numbers on browse cards. Ratings appear only on the restaurant page, and community averages unlock through participation. This is a core trust differentiator vs. Google.
- **Image moderation** (safe-search scanning on uploads) and **report / block** tools.

---

## 6. Built-in growth mechanics (the marketing hooks)

These are already engineered into the product — a social strategy should lean on them:

- **Referral system with codes + links.** Every user has a shareable referral code; new users can enter it at signup. Person-to-person invites are deliberate and Beli-like.
- **Shareable infographics.** Recaps and Lists generate beautiful, brand-stamped share cards designed to be posted to Instagram Stories / TikTok — every share is organic reach *and* soft attribution back to Rasa.
- **Campus leaderboards.** Built for university-by-university competition — a natural driver of tribal, word-of-mouth, "beat your friends" growth.
- **Ambassador program.** A first-class role (`is_ambassador`) that unlocks the ability to create and share curated Lists — ambassadors become a content engine that pre-seeds the app and produces shareable material.
- **Recap as a recurring viral beat.** A monthly cadence that gives every active user a reason to post.

---

## 7. Positioning & differentiation

| | Google Maps | Instagram | **Rasa** |
|---|---|---|---|
| Trustworthy for *your* taste | ❌ generic averages | ❌ aspirational | ✅ friends + taste-match |
| Built for Malaysian food culture | ❌ | ❌ | ✅ hawker/mamak/kopitiam/halal-first |
| Personal ranking of everywhere you've eaten | ❌ | ❌ | ✅ signature mechanic |
| Discovery you act on | ⚠️ noisy | ❌ | ✅ Near Me / Top Rated / For You |
| Social & competitive | ❌ | ⚠️ passive | ✅ feeds, leaderboards, recaps |

**Elevator pitch:** *Rasa is the app that turns your most trusted foodie friends into your recommendation engine — built from the ground up for Malaysia's hawker-to-fine-dining food scene.*

---

## 8. Market context

- Malaysia has a deep, mainstream food-obsessed culture that spans class and ethnicity — food is the national common language.
- High smartphone + social-media penetration; TikTok and Instagram food content is enormous locally.
- No dominant homegrown social food-ranking app — the "Beli for Malaysia" position is open.
- Strong halal + multicultural (Malay / Chinese / Indian) food diversity that global apps handle poorly — a genuine local moat.

---

## 9. Business & tech at a glance

- **Platform:** iOS & Android mobile app (React Native / Expo).
- **Backend:** Supabase (Postgres, Auth, Storage) + Algolia search + Google Places.
- **Status:** Feature-complete for a soft launch; pre-launch content seeding and polish in progress.
- **Monetisation (future, not yet built):** likely a mix of — premium cosmetic themes / gamification coins (partially built), restaurant partnerships & promoted placements, and ambassador/creator tooling. *Deliberately kept out of the early growth phase.*

### Notes for the marketing plan
- **Brand name caveat:** "Rasa" is a common word and a crowded name (existing food blogs/apps + an unrelated AI-software trademark). Secure `rasa.my` + social handles; consider a distinctive tagline/wordmark before heavy spend; a proper trademark clearance is advisable pre-scale.
- **Launch motion to consider:** invite-gated / ambassador-led launch, campus-by-campus rollout, recap-driven monthly virality, and infographic-first organic content on TikTok/IG.

---

*This document describes the product as built for planning purposes. Figures like user counts, budgets, and timelines are for the business plan to define.*
