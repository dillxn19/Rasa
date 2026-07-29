import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { colors, spacing, radius } from '@/theme';
import { useTheme } from '@/theme/ThemeProvider';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { useAuthStore } from '@/stores/authStore';
import { getRestaurantsByCategory, searchRestaurantsSupabase, getRestaurantsByIds } from '@/services/restaurants';
import { getDiscoverUsers, followUser, unfollowUser, searchUsers } from '@/services/users';
import { getFeaturedDishes, getTopRestaurantsForDish, searchDishes } from '@/services/dishes';
import { searchRestaurants } from '@/lib/algolia';
import {
  searchPlaces, resolvePlace, startPlacesSession, endPlacesSession, browseGoogle,
} from '@/services/places';
import { getAppFlag } from '@/services/signup';
import { useSettingsStore } from '@/stores/settingsStore';
import { isHalalFriendly } from '@/lib/halal';
import { bayesianScore } from '@/lib/ranking';
import { toast } from '@/stores/toastStore';
import { useUserLocation } from '@/hooks/useUserLocation';
import { distanceKm, formatDistance } from '@/lib/geo';
import { queryKeys } from '@/lib/queryClient';
import { MALAYSIA_CITIES } from '@/types';
import type { RestaurantCategory, Restaurant, Dish, RestaurantDishEntry, AlgoliaRestaurant } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_GAP = spacing[3];
const CARD_WIDTH = (SCREEN_WIDTH - spacing[4] * 2 - CARD_GAP) / 2;

// ─── Category definitions ─────────────────────────────────────

interface CategoryDef {
  key: RestaurantCategory;
  label: string;
  emoji: string;
  gradientStart: string;
  gradientEnd: string;
}

const FOOD_CATEGORIES: CategoryDef[] = [
  { key: 'hawker', label: 'Hawker', emoji: '🍜', gradientStart: '#F59E0B', gradientEnd: '#D97706' },
  { key: 'mamak', label: 'Mamak', emoji: '🥛', gradientStart: '#10B981', gradientEnd: '#047857' },
  { key: 'cafe', label: 'Café', emoji: '☕', gradientStart: '#8B5CF6', gradientEnd: '#6D28D9' },
  { key: 'kopitiam', label: 'Kopitiam', emoji: '🍳', gradientStart: '#F97316', gradientEnd: '#C2410C' },
  { key: 'fine_dining', label: 'Fine Dining', emoji: '🥂', gradientStart: '#3B82F6', gradientEnd: '#1D4ED8' },
  { key: 'food_court', label: 'Food Court', emoji: '🍱', gradientStart: '#EC4899', gradientEnd: '#BE185D' },
  { key: 'night_market', label: 'Night Market', emoji: '🌙', gradientStart: '#374151', gradientEnd: '#111827' },
  { key: 'restaurant', label: 'Restaurant', emoji: '🍽️', gradientStart: '#D94841', gradientEnd: '#991B1B' },
];

const DISH_CATEGORY_EMOJI: Record<string, string> = {
  rice: '🍚', noodles: '🍜', bread: '🫓', grilled: '🔥', fried: '🍳',
  soup: '🍲', curry: '🍛', salad: '🥗', seafood: '🦐', meat: '🥩',
  dim_sum: '🥟', dessert: '🍮', drinks: '🧃', snacks: '🌮', other: '🍽️',
};

// Curated iconic Malaysian dishes shown as "category" cards — tapping one opens
// the top spots serving it (dish graph, with an Algolia/name fallback).
const POPULAR_MY_DISHES: { name: string; emoji: string; gradient: [string, string] }[] = [
  // Malaysian icons
  { name: 'Nasi Lemak', emoji: '🍚', gradient: ['#D94841', '#8B1E1E'] },
  { name: 'Char Kway Teow', emoji: '🍜', gradient: ['#E07B39', '#B4801F'] },
  { name: 'Roti Canai', emoji: '🫓', gradient: ['#C79A2E', '#8B6914'] },
  { name: 'Teh Tarik', emoji: '🧋', gradient: ['#8B6914', '#5C4A1A'] },
  { name: 'Nasi Kandar', emoji: '🍛', gradient: ['#B45309', '#7C2D12'] },
  { name: 'Satay', emoji: '🍢', gradient: ['#B53535', '#7A1E1E'] },
  { name: 'Wan Tan Mee', emoji: '🍜', gradient: ['#374151', '#1F2937'] },
  { name: 'Chicken Rice', emoji: '🍗', gradient: ['#D9972A', '#A15A1B'] },
  { name: 'Bak Kut Teh', emoji: '🍲', gradient: ['#5C4A1A', '#2E2410'] },
  { name: 'Laksa', emoji: '🍜', gradient: ['#C2410C', '#7C2D12'] },
  { name: 'Dim Sum', emoji: '🥟', gradient: ['#B91C1C', '#7A0E0E'] },
  { name: 'Banana Leaf', emoji: '🍛', gradient: ['#4F8A5B', '#1F5C3A'] },
  // Sweets & drinks
  { name: 'Cendol', emoji: '🍧', gradient: ['#4F8A5B', '#1F5C3A'] },
  { name: 'Bingsu', emoji: '🍨', gradient: ['#60A5FA', '#2563EB'] },
  { name: 'Desserts', emoji: '🍰', gradient: ['#EC4899', '#9D174D'] },
  { name: 'Kopi', emoji: '☕', gradient: ['#7C4A1A', '#4A2E10'] },
  { name: 'Bubble Tea', emoji: '🧋', gradient: ['#8B5E3C', '#5C3A1A'] },
  // General / Western / Asian
  { name: 'Burgers', emoji: '🍔', gradient: ['#B45309', '#7C2D12'] },
  { name: 'Pizza', emoji: '🍕', gradient: ['#DC2626', '#991B1B'] },
  { name: 'Pasta', emoji: '🍝', gradient: ['#D97706', '#92400E'] },
  { name: 'Ramen', emoji: '🍥', gradient: ['#374151', '#1F2937'] },
  { name: 'Sushi', emoji: '🍣', gradient: ['#0F766E', '#134E4A'] },
  { name: 'Korean BBQ', emoji: '🥩', gradient: ['#BE185D', '#7A0E3E'] },
  { name: 'Fried Chicken', emoji: '🍗', gradient: ['#D9972A', '#A15A1B'] },
  { name: 'Steak', emoji: '🥩', gradient: ['#7F1D1D', '#450A0A'] },
  { name: 'Brunch', emoji: '🥞', gradient: ['#CA8A04', '#854D0E'] },
];

// ─── Types ────────────────────────────────────────────────────

type ExploreTab = 'discover' | 'people';
type DiscoverView = 'home' | 'category' | 'dish';
type SortMode = 'near' | 'top';

// Cap category/dish results so a big city doesn't render (or crash) hundreds of
// cards — enough to browse, Beli "want-to-try" sized.
const RESULT_LIMIT = 20;

// An ordered result carries its distance label so the card can show it in Near-Me mode.
interface OrderedResult {
  restaurant: Restaurant;
  distance: string | null;
}

// Shared Bayesian weighted "Top Rated" score (see src/lib/ranking.ts) — used by
// Explore's Top Rated AND home Trending so quality signals are consistent.
// Wrapped in a hoisted function (not a top-level const alias) so the imported
// binding is resolved at call time, avoiding module-init ordering issues.
function topScore(r: Restaurant): number {
  return bayesianScore(r);
}

// Shared ordering for BOTH category + dish results so the two feel identical:
// Near-Me sorts by true distance (places without coords sink to the bottom, keeping
// their popularity order); Top-Rated sorts by rating then review count. Sliced to 20.
function orderRestaurants(
  list: Restaurant[],
  mode: SortMode,
  coords: { lat: number; lng: number } | null,
): OrderedResult[] {
  const withDist = list.map(r => {
    const km = coords && r.latitude != null && r.longitude != null
      ? distanceKm(coords, { lat: r.latitude, lng: r.longitude })
      : null;
    return { restaurant: r, km, distance: formatDistance(coords, r.latitude, r.longitude) };
  });

  withDist.sort((a, b) => {
    if (mode === 'near') {
      if (a.km == null && b.km == null) return 0;
      if (a.km == null) return 1;
      if (b.km == null) return -1;
      return a.km - b.km;
    }
    // Top Rated — Bayesian weighted score (high rating + enough reviews),
    // Rasa data first, Google as the cold-start fallback.
    return topScore(b.restaurant) - topScore(a.restaurant);
  });

  return withDist.slice(0, RESULT_LIMIT).map(({ restaurant, distance }) => ({ restaurant, distance }));
}

// ─── Main screen ──────────────────────────────────────────────

export default function ExploreScreen() {
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { dishName } = useLocalSearchParams<{ dishName?: string }>();
  // Halal is a single, universal preference (set on Home) — Explore just reads it
  // and filters automatically, with no separate toggle here.
  const { halalOnly } = useSettingsStore();

  const [tab, setTab] = useState<ExploreTab>('discover');
  const [view, setView] = useState<DiscoverView>('home');
  const [city, setCity] = useState(profile?.city ?? 'Kuala Lumpur');
  const [activeCat, setActiveCat] = useState<CategoryDef | null>(null);
  const [activeDish, setActiveDish] = useState<Dish | null>(null);
  // Results sub-tab (Near Me default → Top Rated), shared across category + dish views.
  const [sortMode, setSortMode] = useState<SortMode>('near');

  const [searchQ, setSearchQ] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const location = useUserLocation();

  const [peopleQ, setPeopleQ] = useState('');
  const [debouncedPeopleQ, setDebouncedPeopleQ] = useState('');
  const peopleDebounceRef = useRef<ReturnType<typeof setTimeout>>();

  const searchRef = useRef<TextInput>(null);

  const handlePeopleSearch = useCallback((text: string) => {
    setPeopleQ(text);
    clearTimeout(peopleDebounceRef.current);
    peopleDebounceRef.current = setTimeout(() => setDebouncedPeopleQ(text), 300);
  }, []);

  const openCategory = (cat: CategoryDef) => {
    setActiveCat(cat);
    setActiveDish(null);
    setSortMode('near');
    setView('category');
    location.request(); // so Near-Me can sort by distance immediately
  };

  const openDish = (dish: Dish) => {
    setActiveDish(dish);
    setActiveCat(null);
    setSortMode('near');
    setView('dish');
    location.request();
  };

  // Open a dish's results in the dish grid (SAME layout as a category). If the
  // dish isn't in the graph we open a synthetic dish — the dishRestaurants query
  // falls back to a restaurant search, so the view is always consistent.
  const openDishByName = useCallback(async (name: string) => {
    const results = await searchDishes(name, 1).catch(() => []);
    const dish = results.length > 0
      ? results[0]
      : ({ id: '', slug: name.toLowerCase().replace(/\s+/g, '-'), name } as Dish);
    setActiveDish(dish);
    setActiveCat(null);
    setSortMode('near');
    setView('dish');
    location.request();
  }, [location]);

  // Deep link from the home banner / dish chips: /explore?dishName=Teh%20Tarik
  useEffect(() => {
    if (dishName) openDishByName(dishName);
  }, [dishName, openDishByName]);

  const goHome = () => {
    setView('home');
    setActiveCat(null);
    setActiveDish(null);
  };

  // ── Queries ──

  const { data: popularDishes } = useQuery({
    queryKey: ['popularDishes'],
    queryFn: () => getFeaturedDishes(16),
    enabled: view === 'home',
  });

  const { data: categoryRestaurants, isLoading: catLoading } = useQuery({
    // sortMode in the key → switching to Top Rated re-queries for the best-rated
    // spots (not just a client re-sort of the nearby set).
    queryKey: ['catRestaurants', city, activeCat?.key, sortMode, halalOnly],
    queryFn: () => getRestaurantsByCategory(city, activeCat!.key, 50, sortMode === 'top' ? 'top' : 'popular', halalOnly),
    enabled: view === 'category' && !!activeCat,
  });

  // Early-stage gap-filler: while `explore_google_fill` is on, EVERY category
  // browse also pulls real places from Google (Near Me + Top Rated both benefit) —
  // not only when Rasa is sparse — so early explore looks Beli-full, not DB-limited.
  // Flip the flag off (no app rebuild) once the DB is rich. One call per
  // category+city per session (cached). Upserts also progressively stock the DB.
  const { data: googleFill = true } = useQuery({
    queryKey: ['appFlag', 'explore_google_fill'],
    queryFn: () => getAppFlag('explore_google_fill', true),
    staleTime: Infinity,
  });
  const { data: googleSupplement, isFetching: googleFetching } = useQuery({
    queryKey: ['exploreGoogle', view, city, activeCat?.key, activeDish?.name],
    queryFn: () => browseGoogle({
      ...(view === 'dish' ? { dish: activeDish!.name } : { category: activeCat!.key }),
      city,
      lat: location.coords?.lat, lng: location.coords?.lng,
    }),
    enabled: googleFill && (
      (view === 'category' && !!activeCat) || (view === 'dish' && !!activeDish)
    ),
    staleTime: 1000 * 60 * 30,
  });

  const { data: dishRestaurants, isLoading: dishLoading } = useQuery({
    queryKey: ['dishRestaurants', activeDish?.id, activeDish?.name],
    queryFn: async () => {
      // 1) The dish graph (restaurant_dishes) is the canonical mapping.
      //    Skip it for synthetic (not-in-graph) dishes — go straight to search.
      if (activeDish!.id) {
        const graph = await getTopRestaurantsForDish(activeDish!.id, RESULT_LIMIT).catch(() => []);
        if (graph.length > 0) return graph;
      }
      // 2) Fallback so real restaurants still surface even before the graph is
      //    populated: Algolia (indexes dish/tag/cuisine terms) → Postgres name,
      //    then fetch FULL rows by id so the cards render exactly like categories.
      let hits: AlgoliaRestaurant[] = [];
      try {
        const res = await searchRestaurants({ query: activeDish!.name, hitsPerPage: RESULT_LIMIT });
        hits = res.hits;
      } catch { /* Algolia unconfigured */ }
      if (hits.length === 0) hits = await searchRestaurantsSupabase(activeDish!.name, { limit: RESULT_LIMIT }).catch(() => []);
      const full = await getRestaurantsByIds(hits.map(h => h.objectID)).catch(() => []);
      return full.map(r => ({ id: r.id, restaurant: r, average_rating: 0, rating_count: 0 })) as unknown as RestaurantDishEntry[];
    },
    enabled: view === 'dish' && !!activeDish,
  });

  const { data: peopleSearchResults, isLoading: peopleSearchLoading } = useQuery({
    queryKey: ['searchPeople', debouncedPeopleQ],
    queryFn: () => searchUsers(debouncedPeopleQ, profile?.id),
    enabled: debouncedPeopleQ.length >= 2,
  });

  const { data: discoverPeople, isLoading: discoverLoading } = useQuery({
    queryKey: ['discoverUsers', profile?.id],
    queryFn: () => getDiscoverUsers(profile!.id),
    enabled: !!profile && tab === 'people' && debouncedPeopleQ.length < 2,
  });

  // Hybrid search: Rasa places + Google Places for restaurants, plus people.
  // Pass the user's coords so Google biases nearer branches first (Beli-style).
  const coords = location.coords;
  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: [...queryKeys.search(searchQ), coords?.lat, coords?.lng],
    queryFn: async () => {
      const [places, users] = await Promise.all([
        searchPlaces(searchQ, coords ? { lat: coords.lat, lng: coords.lng } : {}),
        searchUsers(searchQ, profile?.id).catch(() => []),
      ]);
      return { rasa: places.rasa, google: places.google, users };
    },
    enabled: searchQ.length >= 2,
  });

  // Unified, sorted results for category + dish views (Near Me / Top Rated, cap 20).
  const orderedResults = React.useMemo(() => {
    let raw: Restaurant[] = view === 'category'
      ? (categoryRestaurants ?? [])
      : ((dishRestaurants ?? []).map(e => e.restaurant).filter(Boolean) as Restaurant[]);
    // Merge in the Google gap-filler (category + dish views), deduped by id.
    if ((googleSupplement?.length ?? 0) > 0) {
      const byId = new Map(raw.map(r => [r.id, r]));
      for (const g of googleSupplement!) if (!byId.has(g.id)) byId.set(g.id, g);
      raw = Array.from(byId.values());
    }
    // Halal filter (certified OR muslim-friendly) applied to the full merged set —
    // covers dish results and Google-filled places the category query can't filter
    // server-side, so a halal user's Explore matches the rest of the app.
    if (halalOnly) raw = raw.filter(r => isHalalFriendly(r.dietary_options));
    return orderRestaurants(raw, sortMode, coords ? { lat: coords.lat, lng: coords.lng } : null);
  }, [view, categoryRestaurants, dishRestaurants, googleSupplement, sortMode, coords, halalOnly]);

  const headerPad = Math.max(insets.top, 44);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: headerPad }]}>
        {/* Back button when drilling down */}
        {view !== 'home' ? (
          <View style={styles.headerDrillRow}>
            <TouchableOpacity style={styles.backBtn} onPress={goHome} activeOpacity={0.7}>
              <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
              <RText variant="titleSmall" style={{ marginLeft: spacing[1] }}>
                {activeCat?.label ?? activeDish?.name}
              </RText>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Search bar */}
            <View style={styles.searchRow}>
              <TouchableOpacity
                style={styles.searchBar}
                onPress={() => { setIsSearching(true); searchRef.current?.focus(); }}
                activeOpacity={1}
              >
                <Ionicons name="search" size={18} color={colors.textSecondary} />
                <TextInput
                  ref={searchRef}
                  style={styles.searchInput}
                  placeholder="Restaurants, dishes, people..."
                  placeholderTextColor={colors.textTertiary}
                  value={searchQ}
                  onChangeText={setSearchQ}
                  onFocus={() => { setIsSearching(true); startPlacesSession(); location.request(); }}
                  returnKeyType="search"
                />
                {searchQ.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQ(''); }}>
                    <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {isSearching && (
                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQ(''); endPlacesSession(); searchRef.current?.blur(); }}>
                  <RText variant="bodyMedium" color={colors.primary} style={{ marginLeft: spacing[3] }}>
                    Cancel
                  </RText>
                </TouchableOpacity>
              )}
            </View>

            {/* Discover | People toggle */}
            <View style={styles.tabToggleRow}>
              <TouchableOpacity
                style={[styles.tabToggle, tab === 'discover' && { borderBottomColor: theme.primary }]}
                onPress={() => setTab('discover')}
              >
                <RText
                  variant="labelMedium"
                  color={tab === 'discover' ? theme.primary : colors.textSecondary}
                >
                  Discover
                </RText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.tabToggle, tab === 'people' && { borderBottomColor: theme.primary }]}
                onPress={() => setTab('people')}
              >
                <RText
                  variant="labelMedium"
                  color={tab === 'people' ? theme.primary : colors.textSecondary}
                >
                  People
                </RText>
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      {/* Search results overlay */}
      {isSearching && searchQ.length >= 2 ? (
        <GlobalSearchResults results={searchResults} isLoading={searchLoading} query={searchQ} />
      ) : tab === 'people' ? (
        // ── People tab ──
        <PeopleContent
          query={peopleQ}
          onQueryChange={handlePeopleSearch}
          searchResults={debouncedPeopleQ.length >= 2 ? peopleSearchResults ?? [] : null}
          discoverPeople={discoverPeople ?? []}
          isLoading={debouncedPeopleQ.length >= 2 ? peopleSearchLoading : discoverLoading}
          currentUserId={profile?.id ?? ''}
        />
      ) : (
        // ── Discover tab ──
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing[24] }}>
          {view === 'home' && (
            <>
              {/* City selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
                {MALAYSIA_CITIES.slice(0, 8).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityChip, city === c && styles.cityChipActive]}
                    onPress={() => setCity(c)}
                  >
                    <RText variant="labelMedium" color={city === c ? colors.white : colors.textSecondary}>
                      {c}
                    </RText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Recommendations — taste match + nearby */}
              <TouchableOpacity
                style={styles.nearMeCard}
                onPress={() => router.push('/recommendations')}
                activeOpacity={0.9}
              >
                <View style={styles.nearMeIcon}>
                  <Ionicons name="sparkles" size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <RText variant="titleMedium">Recommendations</RText>
                  <Caption color={colors.textSecondary}>Picked for your taste — filter by distance too</Caption>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Category grid — food categories AND iconic dishes together */}
              <View style={styles.sectionHeader}>
                <RText variant="h4">Browse</RText>
                <Caption color={colors.textSecondary}>categories & dishes</Caption>
              </View>
              <View style={styles.categoryGrid}>
                {FOOD_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={styles.categoryCard}
                    onPress={() => openCategory(cat)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={[cat.gradientStart, cat.gradientEnd]}
                      style={styles.categoryGradient}
                    >
                      <RText style={{ fontSize: 36, lineHeight: 46 }}>{cat.emoji}</RText>
                      <RText style={styles.categoryLabel}>{cat.label}</RText>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
                {/* Iconic Malaysian dishes as categories → open that dish's top spots */}
                {POPULAR_MY_DISHES.map(d => (
                  <TouchableOpacity
                    key={d.name}
                    style={styles.categoryCard}
                    onPress={() => openDishByName(d.name)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient
                      colors={d.gradient}
                      style={styles.categoryGradient}
                    >
                      <RText style={{ fontSize: 36, lineHeight: 46 }}>{d.emoji}</RText>
                      <RText style={styles.categoryLabel} numberOfLines={2}>{d.name}</RText>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Popular dishes */}
              {(popularDishes ?? []).length > 0 && (
                <>
                  <View style={[styles.sectionHeader, { marginTop: spacing[4] }]}>
                    <RText variant="h4">Popular Dishes</RText>
                    <Caption color={colors.textSecondary}>tap to find the best spots</Caption>
                  </View>
                  <View style={styles.categoryGrid}>
                    {(popularDishes ?? []).map(dish => (
                      <TouchableOpacity
                        key={dish.id}
                        style={styles.dishCard}
                        onPress={() => openDish(dish)}
                        activeOpacity={0.85}
                      >
                        {dish.cover_photo_url ? (
                          <Image
                            source={{ uri: dish.cover_photo_url }}
                            style={styles.dishCardPhoto}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={[styles.dishCardPhoto, styles.dishCardPlaceholder]}>
                            <RText style={{ fontSize: 28, lineHeight: 38 }}>
                              {DISH_CATEGORY_EMOJI[dish.category] ?? '🍽️'}
                            </RText>
                          </View>
                        )}
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.72)']}
                          style={styles.dishCardGradient}
                        />
                        <View style={styles.dishCardOverlay}>
                          <RText style={styles.dishCardName} numberOfLines={2}>{dish.name}</RText>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              )}
            </>
          )}

          {view === 'category' && activeCat && (
            <>
              {/* City selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
                {MALAYSIA_CITIES.slice(0, 8).map(c => (
                  <TouchableOpacity
                    key={c}
                    style={[styles.cityChip, city === c && styles.cityChipActive]}
                    onPress={() => setCity(c)}
                  >
                    <RText variant="labelMedium" color={city === c ? colors.white : colors.textSecondary}>
                      {c}
                    </RText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <SortTabs mode={sortMode} onChange={(m) => { setSortMode(m); if (m === 'near') location.request(); }} />

              {catLoading || (orderedResults.length === 0 && googleFetching) ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
              ) : orderedResults.length === 0 ? (
                <View style={styles.emptyState}>
                  <RText style={{ fontSize: 40, lineHeight: 52 }}>{activeCat.emoji}</RText>
                  <RText variant="titleMedium" style={{ marginTop: spacing[4] }}>
                    No {activeCat.label} spots yet in {city}
                  </RText>
                  <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 260 }}>
                    Be the first to review one!
                  </Caption>
                </View>
              ) : (
                <View style={styles.restaurantGrid}>
                  {orderedResults.map(({ restaurant, distance }) => (
                    <View key={restaurant.id} style={styles.restaurantGridItem}>
                      <RestaurantCard restaurant={restaurant} distance={sortMode === 'near' ? distance : null} />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {view === 'dish' && activeDish && (
            <>
              <SortTabs mode={sortMode} onChange={(m) => { setSortMode(m); if (m === 'near') location.request(); }} />

              {dishLoading || (orderedResults.length === 0 && googleFetching) ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
              ) : orderedResults.length === 0 ? (
                <View style={styles.emptyState}>
                  <RText style={{ fontSize: 40, lineHeight: 52 }}>🍽️</RText>
                  <RText variant="titleMedium" style={{ marginTop: spacing[4] }}>
                    No {activeDish.name} spots yet
                  </RText>
                  <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 260 }}>
                    Rate this dish at a restaurant to get it started!
                  </Caption>
                </View>
              ) : (
                <View style={styles.restaurantGrid}>
                  {orderedResults.map(({ restaurant, distance }) => (
                    <View key={restaurant.id} style={styles.restaurantGridItem}>
                      <RestaurantCard restaurant={restaurant} distance={sortMode === 'near' ? distance : null} />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

// ─── Dish restaurant row ──────────────────────────────────────

// Large hero card for dish results — spacious and photo-forward, not a cramped list.
function DishHeroCard({ entry, rank }: { entry: RestaurantDishEntry; rank: number }) {
  const restaurant = entry.restaurant as Restaurant | undefined;
  if (!restaurant) return null;

  const isMedal = rank <= 3;
  const medal = ['🥇', '🥈', '🥉'][rank - 1];
  const score = entry.average_rating > 0 ? entry.average_rating : restaurant.overall_rating ?? 0;

  return (
    <TouchableOpacity
      style={styles.dishHero}
      onPress={() => router.push(`/restaurant/${restaurant.slug ?? restaurant.id}`)}
      activeOpacity={0.92}
    >
      {restaurant.cover_photo_url ? (
        <Image source={{ uri: restaurant.cover_photo_url }} style={styles.dishHeroPhoto} contentFit="cover" transition={250} />
      ) : (
        <LinearGradient colors={['#3A2A22', '#1C1512']} style={styles.dishHeroPhoto}>
          <View style={styles.dishHeroFallback}>
            <RText style={{ fontSize: 44, lineHeight: 54 }}>
              {DISH_CATEGORY_EMOJI[restaurantDishEmojiKey(restaurant.category)] ?? '🍽️'}
            </RText>
          </View>
        </LinearGradient>
      )}
      <LinearGradient colors={['rgba(0,0,0,0.15)', 'rgba(0,0,0,0.85)']} style={StyleSheet.absoluteFill as any} />

      {/* Rank chip */}
      <View style={styles.dishHeroRank}>
        {isMedal ? (
          <RText style={{ fontSize: 22, lineHeight: 28 }}>{medal}</RText>
        ) : (
          <RText style={{ fontSize: 15, fontWeight: '900', color: colors.white }}>#{rank}</RText>
        )}
      </View>

      {/* Bottom content — no rating shown (avoids surfacing unrated/borrowed numbers) */}
      <View style={styles.dishHeroContent}>
        <RText variant="h2" color={colors.white} numberOfLines={1}>{restaurant.name}</RText>
        <RText variant="bodyMedium" color={colors.whiteTransparent80} numberOfLines={1} style={{ marginTop: 2 }}>
          {restaurant.area ?? restaurant.city} · {restaurant.category?.replace(/_/g, ' ')}
        </RText>
      </View>
    </TouchableOpacity>
  );
}

// Maps a restaurant category to a rough dish-emoji bucket for the fallback tile.
function restaurantDishEmojiKey(cat?: string): string {
  switch (cat) {
    case 'cafe': case 'kopitiam': return 'drinks';
    case 'night_market': case 'food_court': case 'hawker': return 'noodles';
    default: return 'other';
  }
}

// ─── Results sort sub-tabs (Near Me / Top Rated) ─────────────
// Shared by category + dish results so both drill-downs feel identical.

function SortTabs({ mode, onChange }: {
  mode: SortMode; onChange: (m: SortMode) => void;
}) {
  const opts: { key: SortMode; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
    { key: 'near', label: 'Near Me', icon: 'navigate' },
    { key: 'top', label: 'Top Rated', icon: 'star' },
  ];
  return (
    <View style={styles.sortRow}>
      {opts.map(o => {
        const active = mode === o.key;
        return (
          <TouchableOpacity
            key={o.key}
            style={[styles.sortChip, active && styles.sortChipActive]}
            onPress={() => onChange(o.key)}
            activeOpacity={0.85}
          >
            <Ionicons name={o.icon} size={14} color={active ? colors.white : colors.textSecondary} />
            <RText variant="labelMedium" color={active ? colors.white : colors.textSecondary} style={{ marginLeft: 6 }}>
              {o.label}
            </RText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── People content ───────────────────────────────────────────

function PeopleContent({
  query, onQueryChange, searchResults, discoverPeople, isLoading, currentUserId,
}: {
  query: string;
  onQueryChange: (q: string) => void;
  searchResults: { id: string; username: string; display_name: string; avatar_url: string | null; city: string; total_reviews: number }[] | null;
  discoverPeople: { id: string; username: string; display_name: string; avatar_url: string | null; city: string; total_reviews: number }[];
  isLoading: boolean;
  currentUserId: string;
}) {
  const showSearch = searchResults !== null;
  const items = showSearch ? searchResults : discoverPeople;

  return (
    <View style={{ flex: 1 }}>
      {/* People search input */}
      <View style={styles.peopleSearchRow}>
        <View style={styles.peopleSearchBar}>
          <Ionicons name="search" size={16} color={colors.textSecondary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Find food lovers..."
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={onQueryChange}
            returnKeyType="search"
            autoCapitalize="none"
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => onQueryChange('')}>
              <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!showSearch && (
        <View style={styles.sectionHeader}>
          <RText variant="h4">Food Lovers to Follow</RText>
        </View>
      )}

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
      ) : items.length === 0 ? (
        <View style={styles.emptyState}>
          <RText style={{ fontSize: 40, lineHeight: 52 }}>{showSearch ? '🔍' : '👥'}</RText>
          <RText variant="titleMedium" style={{ marginTop: spacing[4] }}>
            {showSearch ? `No one found for "${query}"` : 'No one to follow yet'}
          </RText>
          <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2] }}>
            {showSearch ? 'Try searching a name or @username' : 'Invite friends to join Rasa!'}
          </Caption>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false}>
          {items.map(user => (
            <PeopleRow key={user.id} user={user} currentUserId={currentUserId} />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

// ─── People row ──────────────────────────────────────────────

function PeopleRow({ user, currentUserId }: { user: any; currentUserId: string }) {
  const qc = useQueryClient();
  const [isFollowing, setIsFollowing] = useState(user.is_following ?? false);

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      follow ? followUser(currentUserId, user.id) : unfollowUser(currentUserId, user.id),
    onMutate: (follow) => setIsFollowing(follow),
    onError: (_, follow) => setIsFollowing(!follow),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['discoverUsers', currentUserId] }),
  });

  return (
    <TouchableOpacity
      style={styles.personRow}
      onPress={() => router.push(`/user/${user.username}`)}
      activeOpacity={0.7}
    >
      <Avatar uri={user.avatar_url} name={user.display_name} size="md" />
      <View style={{ flex: 1, marginLeft: spacing[3] }}>
        <RText variant="titleSmall" numberOfLines={1}>{user.display_name}</RText>
        <Caption numberOfLines={1}>@{user.username} · {user.city} · {user.total_reviews} reviews</Caption>
      </View>
      {user.id !== currentUserId && (
        <TouchableOpacity
          style={[styles.followBtn, isFollowing && styles.followingBtn]}
          onPress={() => followMutation.mutate(!isFollowing)}
          disabled={followMutation.isPending}
        >
          <RText variant="labelMedium" color={isFollowing ? colors.textSecondary : colors.white}>
            {isFollowing ? 'Following' : 'Follow'}
          </RText>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
}

// ─── Global search results ────────────────────────────────────

function GlobalSearchResults({
  results, isLoading, query,
}: {
  results: any;
  isLoading: boolean;
  query: string;
}) {
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  // Google result tapped → resolve to a canonical Rasa row, then open it.
  const openGoogle = async (placeId: string, nameHint: string) => {
    if (resolvingId) return;
    setResolvingId(placeId);
    try {
      const r = await resolvePlace(placeId, nameHint);
      if (r) router.push(`/restaurant/${r.objectID}`);
      else toast.error('Could not open that place. Try again.');
    } catch {
      toast.error('Could not open that place. Try again.');
    } finally {
      setResolvingId(null);
    }
  };

  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />;
  if (!results) return null;

  const rasa = results.rasa ?? [];
  const google = results.google ?? [];
  const users = results.users ?? [];
  const hasRestaurants = rasa.length > 0;
  const hasGoogle = google.length > 0;
  const hasUsers = users.length > 0;

  if (!hasRestaurants && !hasGoogle && !hasUsers) {
    return (
      <View style={styles.emptyState}>
        <RText style={{ fontSize: 40, lineHeight: 52 }}>🔍</RText>
        <RText variant="titleLarge" color={colors.textSecondary} style={{ marginTop: spacing[3] }}>
          No results for "{query}"
        </RText>
        <Caption color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
          Try a dish, restaurant name, or city
        </Caption>
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 320 }}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode="on-drag"
      showsVerticalScrollIndicator={false}
    >
      {(hasRestaurants || hasGoogle) && (
        <View style={styles.searchSection}>
          <RText variant="labelSmall" color={colors.textTertiary} style={styles.searchSectionTitle}>
            RESTAURANTS
          </RText>
          {/* Rasa + Google rendered identically (Beli-style — no visible split) */}
          {rasa.map((r: any) => (
            <TouchableOpacity
              key={r.id}
              style={styles.searchResultRow}
              onPress={() => router.push(`/restaurant/${r.id}`)}
            >
              <View style={styles.searchResultIcon}>
                <Ionicons name="restaurant" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <RText variant="titleSmall" numberOfLines={1}>{r.name}</RText>
                <Caption numberOfLines={1}>{r.area || r.city} · {r.category}</Caption>
              </View>
            </TouchableOpacity>
          ))}
          {google.map((g: any) => (
            <TouchableOpacity
              key={g.placeId}
              style={styles.searchResultRow}
              onPress={() => openGoogle(g.placeId, g.name)}
              disabled={!!resolvingId}
            >
              <View style={styles.searchResultIcon}>
                <Ionicons name="restaurant" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <RText variant="titleSmall" numberOfLines={1}>{g.name}</RText>
                {!!g.secondary && <Caption numberOfLines={1}>{g.secondary}</Caption>}
              </View>
              {resolvingId === g.placeId
                ? <ActivityIndicator size="small" color={colors.primary} />
                : null}
            </TouchableOpacity>
          ))}
        </View>
      )}
      {hasUsers && (
        <View style={styles.searchSection}>
          <RText variant="labelSmall" color={colors.textTertiary} style={styles.searchSectionTitle}>
            PEOPLE
          </RText>
          {results.users.map((u: any) => (
            <TouchableOpacity
              key={u.id}
              style={styles.searchResultRow}
              onPress={() => router.push(`/user/${u.username}`)}
            >
              <View style={styles.searchResultIcon}>
                <Ionicons name="person" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <RText variant="titleSmall">{u.display_name}</RText>
                <Caption>@{u.username} · {u.city}</Caption>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// ─── Styles ───────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[2],
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerDrillRow: {
    paddingBottom: spacing[3],
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[3],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 1,
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },

  tabToggleRow: {
    flexDirection: 'row',
    gap: spacing[5],
    paddingBottom: spacing[1],
  },
  tabToggle: {
    paddingBottom: spacing[2],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabToggleActive: {
    borderBottomColor: colors.primary,
  },

  // City chips
  cityRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  cityChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  cityChipActive: {
    backgroundColor: colors.secondary,
  },

  // Near Me / Top Rated sub-tabs
  sortRow: {
    flexDirection: 'row',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
    paddingBottom: spacing[3],
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  sortChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  // Section headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    paddingTop: spacing[2],
  },

  // Craving / curated dishes (category-style cards)
  cravingRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[2],
  },
  cravingCard: {
    width: 116,
    height: 116,
    borderRadius: radius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[2],
    gap: spacing[1],
  },
  cravingLabel: {
    color: colors.white,
    fontSize: 13,
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 16,
  },

  // Near me
  nearMeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    padding: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    gap: spacing[3],
  },
  nearMeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Category grid
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: CARD_GAP,
  },
  categoryCard: {
    width: CARD_WIDTH,
    height: 120,
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  categoryGradient: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  categoryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },

  // Dish cards
  dishCard: {
    width: CARD_WIDTH,
    height: 100,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
  },
  dishCardPhoto: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  dishCardPlaceholder: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray100,
  },
  dishCardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '65%',
  },
  dishCardOverlay: {
    position: 'absolute',
    bottom: spacing[2] + 2,
    left: spacing[2] + 2,
    right: spacing[2] + 2,
  },
  dishCardName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 17,
  },

  // Restaurant grid
  restaurantGrid: {
    paddingHorizontal: spacing[4],
  },
  restaurantGridItem: {
    marginBottom: spacing[2],
  },

  // Dish result hero cards
  dishHeroList: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    gap: spacing[3],
  },
  dishHero: {
    height: 240,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.gray100,
    justifyContent: 'flex-end',
  },
  dishHeroPhoto: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  dishHeroFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  dishHeroRank: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    minWidth: 36,
    height: 36,
    paddingHorizontal: spacing[2],
    borderRadius: radius.full,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dishHeroContent: {
    padding: spacing[4],
  },
  dishHeroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[1],
  },
  dishHeroScore: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },

  // People tab
  peopleSearchRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  peopleSearchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    gap: spacing[2],
  },
  personRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  followBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },

  // Search results
  searchSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  searchSectionTitle: {
    paddingVertical: spacing[3],
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  googleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  rasaHeaderRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3], gap: spacing[2] },
  rasaDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.primary },
  searchResultIcon: {
    width: 38,
    height: 38,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Empty / loading
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing[16],
    paddingHorizontal: spacing[8],
  },
});
