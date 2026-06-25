# Rasa — System Architecture

## Overview

Rasa uses a modern, serverless-first architecture designed to scale to 1M+ users without re-architecting.

```
┌─────────────────────────────────────────────────────┐
│                   Mobile Client                      │
│         React Native + Expo + TypeScript             │
│                                                      │
│  ┌──────────┐  ┌──────────┐  ┌────────────────────┐ │
│  │ Zustand  │  │  React   │  │   Expo Router      │ │
│  │ (state)  │  │  Query   │  │   (navigation)     │ │
│  └──────────┘  └──────────┘  └────────────────────┘ │
└──────────────────────┬──────────────────────────────┘
                       │ HTTPS / WSS
         ┌─────────────┼──────────────┐
         │             │              │
    ┌────▼────┐  ┌─────▼─────┐  ┌───▼──────┐
    │Supabase │  │  Algolia  │  │ Google   │
    │  API    │  │  Search   │  │  Maps    │
    └────┬────┘  └───────────┘  └──────────┘
         │
    ┌────┴──────────────────┐
    │      Supabase         │
    │  ┌─────────────────┐  │
    │  │   PostgreSQL    │  │
    │  │  (with PostGIS) │  │
    │  └─────────────────┘  │
    │  ┌─────────────────┐  │
    │  │   Auth (GoTrue) │  │
    │  └─────────────────┘  │
    │  ┌─────────────────┐  │
    │  │ Storage (S3)    │  │
    │  └─────────────────┘  │
    │  ┌─────────────────┐  │
    │  │ Realtime        │  │
    │  │ (Phoenix Chans) │  │
    │  └─────────────────┘  │
    │  ┌─────────────────┐  │
    │  │ Edge Functions  │  │
    │  │ (Deno)          │  │
    │  └─────────────────┘  │
    └───────────────────────┘
```

---

## Frontend Architecture

### State Management

```
AuthStore (Zustand)          React Query
├── session                  ├── Feed cache
├── supabaseUser             ├── Restaurant cache
├── profile                  ├── User cache
├── isLoading                ├── Search results
└── Actions:                 └── Notifications
    ├── initialize()
    ├── signOut()
    └── refreshProfile()
```

### Data Fetching Strategy

| Data Type | Strategy | Staletime | Notes |
|-----------|----------|-----------|-------|
| Home feed | Infinite query | 2 min | Refetch on focus |
| Restaurant | Cached query | 10 min | Background refetch |
| User profile | Cached query | 5 min | |
| Search | Instant query | 30 sec | Algolia powered |
| Notifications | Polling + WS | Realtime | Supabase subscriptions |

### Navigation Structure

```
Root Stack
├── index (redirect)
├── (auth)/
│   ├── welcome
│   ├── login
│   ├── register
│   └── onboarding
├── (tabs)/
│   ├── index       ← Home Feed
│   ├── explore     ← Search & Browse
│   ├── add         ← Rate Restaurant
│   ├── activity    ← Notifications
│   └── profile     ← My Profile
├── restaurant/[id]
├── user/[username]
└── list/[id]
```

---

## Backend Architecture (Supabase)

### Database Schema (PostgreSQL)

**Core entities:** 18 tables

```
users (core profile)
├── restaurants (food businesses)
│   ├── restaurant_photos
│   └── popular_dishes
├── reviews (ratings + text)
├── visits (check-ins)
├── follows (social graph)
├── likes (polymorphic)
├── comments
├── saved_restaurants (wishlist)
├── lists
│   ├── list_items
│   ├── list_follows
│   └── list_collaborators
├── badges + user_badges
├── taste_similarity (computed)
├── recommendations (computed)
├── notifications
├── food_passports (gamification)
├── activity_events (feed source)
└── reports (moderation)
```

### Row Level Security

Every table has RLS enabled. Key principles:
- Public data (restaurants, public reviews): `SELECT` for all
- Private data (visits, saves): `SELECT` only by owner
- Social data (follows, likes): `INSERT/DELETE` by authenticated owner
- Admin data: `ALL` by `is_admin = true`

### Edge Functions

| Function | Trigger | Purpose |
|----------|---------|---------|
| `sync-to-algolia` | DB webhook on restaurants | Keep search index updated |
| `send-push-notification` | DB webhook on notifications | Push via Expo |
| `generate-recommendations` | Cron (daily) | Refresh recs for active users |
| `calculate-similarity` | After follow | Update taste similarity scores |
| `weekly-digest` | Cron (weekly) | Email digest to users |
| `check-badges` | After review/visit | Award earned badges |

### Storage Buckets

| Bucket | Access | Max Size |
|--------|--------|----------|
| `avatars` | Public read | 2 MB |
| `restaurant-photos` | Public read | 10 MB |
| `review-photos` | Public read | 10 MB |
| `list-covers` | Public read | 5 MB |

CDN: All storage goes through Supabase's built-in CDN (backed by Cloudflare).

---

## Search Architecture (Algolia)

### Indices

| Index | Records | Replica |
|-------|---------|---------|
| `rasa_restaurants` | All approved restaurants | By rating |
| `rasa_restaurants_nearby` | Same + geo | By distance |
| `rasa_users` | Public user profiles | - |
| `rasa_lists` | Public lists | - |

### Restaurant Index Schema

```json
{
  "objectID": "uuid",
  "name": "Village Park Restaurant",
  "slug": "village-park-restaurant-damansara",
  "category": "hawker",
  "cuisines": ["malay"],
  "city": "Petaling Jaya",
  "area": "Damansara Uptown",
  "address": "...",
  "overall_rating": 4.8,
  "total_reviews": 1200,
  "cover_photo_url": "...",
  "price_range": "$",
  "dietary_options": ["halal_certified"],
  "tags": ["nasi lemak", "fried chicken"],
  "_geoloc": { "lat": 3.139, "lng": 101.621 }
}
```

### Sync Strategy
- Nightly full re-index via Edge Function
- Webhook-triggered partial updates on restaurant changes
- Algolia Search Rules for synonym handling (e.g., "laksa" → "laxsa", "mee" → "mi")

---

## Recommendation Engine

### Algorithm v1 (MVP)

Three-pass scoring system:

```
Score(user, restaurant) =
  w₁ × TasteMatch(user, similar_users, restaurant) +
  w₂ × FriendActivity(user, restaurant) +
  w₃ × Trending(restaurant, city)

Where:
  w₁ = 0.5 (taste match weight)
  w₂ = 0.3 (friend activity weight)
  w₃ = 0.2 (trending weight)
```

### Taste Matching Algorithm

Uses **Cosine Similarity** on rating vectors:

```python
def cosine_similarity(user_a_ratings, user_b_ratings):
    # Find common restaurants
    common = set(user_a_ratings.keys()) & set(user_b_ratings.keys())
    if len(common) < 3:
        return 0.0  # Need at least 3 common restaurants
    
    # Build rating vectors for common restaurants
    vec_a = [user_a_ratings[r] for r in common]
    vec_b = [user_b_ratings[r] for r in common]
    
    # Cosine similarity
    dot_product = sum(a * b for a, b in zip(vec_a, vec_b))
    norm_a = sqrt(sum(a**2 for a in vec_a))
    norm_b = sqrt(sum(b**2 for b in vec_b))
    
    return dot_product / (norm_a * norm_b)
```

Similarity is computed:
- Between all mutual followers (real-time on follow)
- Nightly batch for all active users with 5+ reviews
- Stored in `taste_similarity` table for fast reads

### Algorithm v2 (Post-MVP)

- Matrix factorization (SVD) on the full rating matrix
- Cuisine preference vectors
- Time-of-day and day-of-week patterns
- Price range affinity
- Geographic clustering

---

## Scalability Plan

### 0 → 10K Users
- Supabase Free tier → Pro plan ($25/mo)
- Single Supabase project
- Algolia Free (10K records, 10K searches/month)

### 10K → 100K Users
- Supabase Pro → Team plan ($599/mo)
- Read replicas for heavy read queries
- Algolia Grow plan
- Redis cache layer for hot data (recommendations, trending)
- CDN for images (Cloudflare R2 or Supabase Storage CDN)
- Edge Functions for recommendation processing

### 100K → 1M Users
- Dedicated database with connection pooling (PgBouncer)
- Horizontal read replicas
- Separate microservice for recommendation engine (Python/FastAPI)
- Message queue for async processing (Redis Queue or Bull)
- Separate notification service
- Multi-region deployment
- Algolia Premium for higher throughput

### Database Optimizations for Scale
```sql
-- Partial indexes for common filter patterns
CREATE INDEX idx_reviews_public_recent 
  ON reviews(created_at DESC) 
  WHERE is_public = true;

-- Materialized view for restaurant stats (refresh every hour)
CREATE MATERIALIZED VIEW restaurant_stats AS
  SELECT 
    restaurant_id,
    COUNT(*) as review_count,
    AVG(rating) as avg_rating,
    COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as weekly_reviews
  FROM reviews WHERE is_public = true
  GROUP BY restaurant_id;

-- Partition activity_events by month
CREATE TABLE activity_events_2026_01 
  PARTITION OF activity_events 
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');
```

---

## Push Notifications

### Setup
- Expo Push Notification service
- Store `push_token` in `users` table on app open
- Edge Function triggered by notification INSERT

### Notification Types & Templates

| Type | Template |
|------|----------|
| follow | `{name} started following you` |
| like_review | `{name} liked your review of {restaurant}` |
| comment | `{name} commented: "{snippet}"` |
| badge_earned | `You earned the {badge} badge! 🏅` |
| taste_match | `You and {name} have a 94% taste match!` |
| weekly_digest | `See what your foodie friends ate this week` |

---

## Analytics (PostHog)

### Tracked Events

**Core funnel:**
- `user_signed_up`
- `onboarding_completed`
- `first_review_posted`
- `first_follow_made`

**Engagement:**
- `feed_scrolled` (depth)
- `restaurant_viewed`
- `review_posted`
- `photo_uploaded`
- `restaurant_saved`
- `list_created`

**Social:**
- `user_followed`
- `review_liked`
- `review_commented`
- `list_followed`

**Discovery:**
- `search_performed` (query, results_count)
- `recommendation_clicked`
- `explore_filter_applied`

### Feature Flags (PostHog)
- `taste_matching_enabled` — gradual rollout
- `recommendations_v2` — A/B test
- `collaborative_lists` — beta group

---

## Security

### Authentication
- JWT tokens managed by Supabase GoTrue
- Token refresh: 1 hour access, 7 days refresh
- OAuth: Google, Apple (planned)
- Email verification required

### Data Security
- Row Level Security on all tables
- API keys scoped: `anon` key in app (read-only by default), `service_role` only in Edge Functions
- No credentials in mobile app bundle
- Photo URLs: public CDN (non-sensitive), but review_photos require auth
- Input sanitization on all text fields
- Rate limiting via Supabase middleware

### Privacy
- Private reviews: RLS ensures only owner can read
- Block user: mutual follow removal + feed hiding
- Report system with admin review
- Data export on request (PDPA compliance)
- Account deletion: cascade delete all user data

---

## Deployment

### Mobile
```
Development → EAS Build (internal distribution) → TestFlight/Play Store Internal → Production
```

### Database migrations
```bash
# Apply migrations
supabase db push

# Generate types
npm run supabase:gen-types
```

### CI/CD (GitHub Actions)
```yaml
on: push to main:
  - Run TypeScript type check
  - Run Jest tests
  - EAS Build (if tagged release)
  - Apply DB migrations to staging
  - Run smoke tests
  - Deploy to production
```

---

## API Conventions

### Supabase Direct Queries
The app talks directly to Supabase via the JS client — no custom API layer needed for MVP.

All queries follow:
```typescript
const { data, error } = await supabase
  .from('table_name')
  .select('column1, column2, joined:other_table(*)')
  .eq('field', value)
  .order('created_at', { ascending: false })
  .limit(20);

if (error) throw error;
return data;
```

### Pagination
All list endpoints use offset pagination:
```typescript
.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
```

Cursor-based pagination planned for v2 (activity feeds).

### Error Handling
```typescript
try {
  const result = await someQuery();
  return result;
} catch (error) {
  if (error instanceof PostgrestError) {
    // Database errors
  }
  throw error; // React Query handles retry
}
```
