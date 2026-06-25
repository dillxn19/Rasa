# Rasa — Product Requirements Document

**Version:** 1.0.0  
**Date:** June 2026  
**Status:** In development

---

## 1. Vision

Rasa is a social food discovery platform for Malaysia where users discover restaurants through trusted people rather than anonymous reviews.

> **Core philosophy:** The best restaurant recommendations come from people whose taste you trust.

Rasa is the Malaysian equivalent of Beli — a food-first social network that helps you answer: *"What should I eat next, and who has the same taste as me?"*

---

## 2. Problem

Existing food discovery apps (Google Maps, Grab Food, Yelp) fail in key ways:
- Reviews are anonymous and untrustworthy
- No social graph — you can't see what YOUR friends think
- No taste matching — recommendations aren't personalised
- No food identity — users can't build a meaningful food profile
- Not built for Malaysian food culture (Halal filters, hawker, mamak, etc.)

---

## 3. Target Market

### Primary
- Malaysia: Kuala Lumpur, Petaling Jaya, Penang, Johor Bahru, Subang Jaya

### Secondary  
- Singapore, Southeast Asia

### Audience
| Segment | Size | Characteristics |
|---------|------|-----------------|
| Young professionals | Large | 25–35, disposable income, food-curious |
| University students | Large | 18–24, social, trend-driven |
| Foodies & food bloggers | Medium | High engagement, content creators |
| Travelers | Medium | New to the city, need reliable guides |

---

## 4. Core User Flows

### 4.1 Onboarding
1. Sign up (email / Google)
2. Create profile: name, username, photo, city
3. Select cuisines + dietary preferences
4. Rate 10+ restaurants (or import from social media)
5. Follow suggested users (friends, top food influencers)
6. Land on personalised home feed

### 4.2 Home Feed
Infinite scroll of activity from followed users:
- Restaurant reviews (rating + optional text + photos)
- Restaurant visits (without a review)
- New lists created
- Badges earned
- Milestones

Feed cards are visually rich: large food photo, username, rating, brief review.

### 4.3 Restaurant Discovery
**Entry points:**
- Home feed (from friends)
- Explore tab (search + browse)
- Taste match recommendations
- Lists from followed users

**Filters:**
- City / area
- Category: hawker / mamak / cafe / fine dining / kopitiam / food court / night market
- Cuisine type
- Price range
- Dietary: Halal certified / Muslim friendly / Vegetarian / Vegan / Pork free
- Rating (min 4 stars)

### 4.4 Rating a Restaurant
1. Search for restaurant
2. Give 0.5–5 star rating
3. Optional: short text review (500 chars)
4. Optional: upload photos (max 5)
5. Tag dishes mentioned
6. Set visibility (public / private)
7. Posted to feed automatically

### 4.5 Taste Matching
The app calculates a **Taste Match %** between users using:
- Cosine similarity on restaurant rating vectors
- Cuisine preference overlap
- Common restaurants visited
- Geographic preferences

Result: `You ↔ Sarah: 94% Match`  
Used for: recommendations, suggested follows, social proof on restaurants.

### 4.6 Recommendation Engine
Sections:
- **For You** — from taste-matched users who rated highly
- **Friends Visited** — restaurants 2+ friends have been to
- **Trending** — high recent activity in your city
- **Hidden Gems** — high rating, low popularity score
- **Weekend Picks** — curated, changes weekly

### 4.7 Food Passport
Gamification layer tracking:
- Restaurants visited
- Cities explored
- States visited (all 13 Malaysian states)
- Cuisines tried (14 categories)
- Badges earned
- Streak days

### 4.8 Lists
Users create lists (public / private / collaborative):
- Best Nasi Lemak in KL
- Date Night Spots Bangsar
- Penang Weekend Food Trip
- Best Cafes for Work

List features: cover photo, description, follower count, collaborative editing, location tag.

---

## 5. Key Screens

| Screen | Purpose |
|--------|---------|
| Welcome | Onboarding entry, brand intro |
| Login / Register | Auth |
| Onboarding | Profile setup, preference collection |
| Home Feed | Activity from followed users |
| Explore | Search + trending + browse by category |
| Add Review | Rate restaurants, upload photos |
| Activity | Notifications |
| Profile | Own profile, reviews, passport, badges |
| Restaurant | Full restaurant page |
| User Profile | Another user's profile |
| List | Curated restaurant list |
| Taste Match | Detailed compatibility view |
| Edit Profile | Update name, bio, photo, preferences |

---

## 6. Malaysia-Specific Features

### Food Categories
| Category | Description |
|----------|-------------|
| Hawker | Open-air stalls, noodles, rice dishes |
| Mamak | 24-hour Indian Muslim restaurants |
| Kopitiam | Old-school coffee shop |
| Cafe | Modern specialty coffee + brunch |
| Food Court | Indoor multi-stall eating area |
| Night Market (Pasar Malam) | Outdoor weekly markets |
| Fine Dining | White tablecloth restaurants |

### Halal Indicators
- 🟢 **Halal Certified** — JAKIM/JAIN certification
- 🟡 **Muslim Friendly** — No pork, not certified
- 🔵 **Pork Free** — Chinese establishments, no pork

### Languages
- English (primary)
- Bahasa Malaysia
- Chinese (Simplified / Traditional)

### Local Slang & UX
- "Makan" = eat (use in copy)
- "Sedap" = delicious
- "Die die must try" = must visit
- Price range in MYR

---

## 7. Business Metrics (KPIs)

### Growth
- MAU (Monthly Active Users)
- DAU/MAU ratio (target: 40%+)
- New user registrations per week
- Restaurants added per week

### Engagement
- Reviews posted per DAU
- Photos uploaded per DAU
- Feed scroll depth
- Session length (target: 8+ minutes)
- D1 / D7 / D30 retention

### Social
- Follows per new user
- Feed engagement rate (like/comment per card)
- Taste matches made
- Lists created

---

## 8. MVP Scope (v1.0)

### ✅ Included
- Auth (email + Google)
- Onboarding flow
- Home feed (followed users activity)
- Restaurant profiles (basic info, photos, ratings, reviews)
- Rating + review submission
- User profiles
- Follow / unfollow
- Like reviews
- Comment on reviews
- Explore tab with search (Algolia)
- Restaurant saving (wishlist)
- Push notifications (follows, likes, comments)
- Food passport (tracking)
- 20+ badges

### ❌ Excluded from v1.0
- Taste matching (v2)
- Recommendation engine (v2)
- Lists (v2)
- Collaborative lists (v2)
- Restaurant claiming (v2)
- Admin dashboard (v2)
- Analytics dashboard (v2)
- Multilingual support (v3)

---

## 9. v2 Roadmap

| Feature | Impact | Effort |
|---------|--------|--------|
| Taste matching algorithm | High | Medium |
| Recommendation engine | High | High |
| Lists (public/private/collaborative) | High | Medium |
| Restaurant importing (photos/check-ins) | Medium | High |
| Restaurant claiming & management | Medium | High |
| Admin moderation dashboard | Medium | Medium |
| Multilingual (BM, Chinese) | Medium | High |
| Maps integration (nearby mode) | Medium | Medium |
| Weekly digest newsletter | Low | Low |
| Verified food critic badges | Low | Low |
| Event tickets integration | Low | High |

---

## 10. Security & Privacy

- All passwords hashed by Supabase Auth (bcrypt)
- Row Level Security on all database tables
- Private reviews never exposed in API
- Photo storage uses signed URLs
- No personal data sold to third parties
- PDPA (Malaysia) compliance
- GDPR compliance (for EU users)
- Data deletion on account request

---

## 11. Monetisation (Future)

| Stream | Description | Timeline |
|--------|-------------|----------|
| Premium subscription | "Rasa Pro" — unlimited saves, analytics, early access | v3 |
| Restaurant promotions | Highlighted placement in search | v3 |
| Verified restaurant pages | Enhanced business profiles | v2 |
| Data insights | Aggregate trend reports for F&B industry | v4 |
| Events | Reserve tickets to food events via app | v4 |
