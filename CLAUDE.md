# Rasa — Development Guide for Claude Code

## Project Overview
Rasa is a social food discovery app for Malaysia (Malaysia's equivalent of Beli).
Built with React Native + Expo + TypeScript + Supabase.

## Key Commands
```bash
npm start           # Start Expo dev server
npm run ios         # Run on iOS simulator
npm run android     # Run on Android emulator
npm run type-check  # TypeScript check (no emit)
npm run lint        # ESLint
npm run test        # Jest tests
npm run supabase:gen-types  # Regenerate Supabase types
```

## Project Structure
```
app/              # Expo Router file-based navigation
src/
  components/     # Reusable UI components
  hooks/          # Custom React hooks
  lib/            # Supabase client, Algolia, React Query config
  services/       # Data fetching functions (Supabase queries)
  stores/         # Zustand state management
  theme/          # Colors, typography, spacing
  types/          # TypeScript types (database + app)
supabase/
  migrations/     # SQL migrations (run in order)
docs/             # PRD, architecture, API docs
scripts/          # One-off scripts (Algolia indexing)
```

## Architecture Decisions
- **No custom API**: App talks directly to Supabase via JS client
- **RLS everywhere**: Row Level Security on all tables
- **No Redux**: Zustand for global state, React Query for server state
- **Expo Router**: File-based routing (similar to Next.js)
- **FlashList**: For performant infinite scroll feeds (not FlatList)

## Design System
Colors: `src/theme/colors.ts` — primary `#D94841` (Deep Chili Red), bg `#FFF8F0` (Coconut Cream), accent `#F4B942` (Turmeric Gold), success `#4F8A5B` (Pandan Green)
Typography: `src/theme/typography.ts`
Spacing: `src/theme/index.ts` (uses 4px base unit)
All styled with StyleSheet.create (no styled-components)

## Database
- PostgreSQL via Supabase
- PostGIS for geo queries
- All migrations in `supabase/migrations/`
- Types auto-generated from schema: `src/types/database.ts`

## Environment Setup
1. Copy `.env.example` to `.env`
2. Fill in Supabase, Algolia, Google Maps API keys
3. Run migrations: `supabase db push`
4. Index restaurants: `npm run algolia:index`
5. Start app: `npm start`

## Malaysian Food Context
- Primary food categories: hawker, mamak, cafe, kopitiam, fine_dining, food_court, night_market
- Halal is critical: always show halal_certified / muslim_friendly indicators
- Prices in MYR
- Key cities: KL, PJ, Penang, JB, Subang, Shah Alam

## Key Features Status
- [x] Database schema + migrations
- [x] Auth (email + Google via Supabase)
- [x] Onboarding flow
- [x] Home feed (activity from followed users)
- [x] Restaurant profiles
- [x] User profiles + follow/unfollow
- [x] Review submission (rating + text + photos)
- [x] Like / comment on reviews
- [x] Explore / search (Algolia)
- [x] Notifications
- [x] Food passport + badges
- [ ] Taste matching UI (algorithm implemented, UI pending)
- [ ] Recommendations feed section (DB function ready, UI pending)
- [x] Lists feature (`app/list/[id].tsx` complete)
- [x] Dish-first discovery (schema, service, DishCard, DishRanking, `app/dish/[id].tsx`)
- [x] Food Trails (schema, service, TrailCard, `app/trail/[id].tsx`)
- [x] Community food tags on restaurant profiles (FoodTag components + restaurant screen)
- [x] Time-aware discovery banner (TimeAwareBanner adapts per meal time)
- [x] Explore screen: Restaurants / Dishes / Trails tabs
- [ ] Admin dashboard
- [ ] Multilingual (BM/ZH) — v3
