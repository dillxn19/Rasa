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
import { getRestaurantsByCategory, searchRestaurantsSupabase } from '@/services/restaurants';
import { getDiscoverUsers, followUser, unfollowUser, searchUsers } from '@/services/users';
import { getFeaturedDishes, getTopRestaurantsForDish, searchDishes } from '@/services/dishes';
import { multiSearch, searchRestaurants } from '@/lib/algolia';
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
  { name: 'Nasi Lemak', emoji: '🍚', gradient: ['#D94841', '#8B1E1E'] },
  { name: 'Char Kway Teow', emoji: '🍜', gradient: ['#E07B39', '#B4801F'] },
  { name: 'Roti Canai', emoji: '🫓', gradient: ['#C79A2E', '#8B6914'] },
  { name: 'Teh Tarik', emoji: '🧋', gradient: ['#8B6914', '#5C4A1A'] },
  { name: 'Nasi Kandar', emoji: '🍛', gradient: ['#B45309', '#7C2D12'] },
  { name: 'Satay', emoji: '🍢', gradient: ['#B53535', '#7A1E1E'] },
  { name: 'Wan Tan Mee', emoji: '🍜', gradient: ['#374151', '#1F2937'] },
  { name: 'Chicken Rice', emoji: '🍗', gradient: ['#D9972A', '#A15A1B'] },
  { name: 'Cendol', emoji: '🍧', gradient: ['#4F8A5B', '#1F5C3A'] },
  { name: 'Char Siew', emoji: '🥩', gradient: ['#BE185D', '#7A0E3E'] },
];

// ─── Types ────────────────────────────────────────────────────

type ExploreTab = 'discover' | 'people';
type DiscoverView = 'home' | 'category' | 'dish';

// ─── Main screen ──────────────────────────────────────────────

export default function ExploreScreen() {
  const { profile } = useAuthStore();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { dishName } = useLocalSearchParams<{ dishName?: string }>();

  const [tab, setTab] = useState<ExploreTab>('discover');
  const [view, setView] = useState<DiscoverView>('home');
  const [city, setCity] = useState(profile?.city ?? 'Kuala Lumpur');
  const [activeCat, setActiveCat] = useState<CategoryDef | null>(null);
  const [activeDish, setActiveDish] = useState<Dish | null>(null);

  const [searchQ, setSearchQ] = useState('');
  const [isSearching, setIsSearching] = useState(false);

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
    setView('category');
  };

  const openDish = (dish: Dish) => {
    setActiveDish(dish);
    setActiveCat(null);
    setView('dish');
  };

  // Resolve a dish by name (from banner pills / curated chips) → open its top spots.
  const openDishByName = useCallback(async (name: string) => {
    const results = await searchDishes(name, 1).catch(() => []);
    if (results.length > 0) {
      setActiveDish(results[0]);
      setActiveCat(null);
      setView('dish');
    }
  }, []);

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
    queryKey: ['catRestaurants', city, activeCat?.key],
    queryFn: () => getRestaurantsByCategory(city, activeCat!.key),
    enabled: view === 'category' && !!activeCat,
  });

  const { data: dishRestaurants, isLoading: dishLoading } = useQuery({
    queryKey: ['dishRestaurants', activeDish?.id, activeDish?.name],
    queryFn: async () => {
      // 1) The dish graph (restaurant_dishes) is the canonical mapping.
      const graph = await getTopRestaurantsForDish(activeDish!.id, 15);
      if (graph.length > 0) return graph;
      // 2) Fallback so real restaurants still surface even before the graph is
      //    populated: Algolia (indexes dish/tag/cuisine terms) → Postgres name.
      let hits: AlgoliaRestaurant[] = [];
      try {
        const res = await searchRestaurants({ query: activeDish!.name, hitsPerPage: 15 });
        hits = res.hits;
      } catch { /* Algolia unconfigured */ }
      if (hits.length === 0) hits = await searchRestaurantsSupabase(activeDish!.name, { limit: 15 }).catch(() => []);
      return hits.map(h => ({
        id: h.objectID,
        restaurant: {
          id: h.objectID, slug: h.slug, name: h.name, category: h.category,
          city: h.city, area: h.area, overall_rating: h.overall_rating, cover_photo_url: h.cover_photo_url,
        },
        average_rating: h.overall_rating ?? 0,
        rating_count: 0,
      })) as unknown as RestaurantDishEntry[];
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

  const { data: searchResults, isLoading: searchLoading } = useQuery({
    queryKey: queryKeys.search(searchQ),
    queryFn: () => multiSearch(searchQ),
    enabled: searchQ.length >= 2,
  });

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
                  onFocus={() => setIsSearching(true)}
                  returnKeyType="search"
                />
                {searchQ.length > 0 && (
                  <TouchableOpacity onPress={() => { setSearchQ(''); }}>
                    <Ionicons name="close-circle" size={16} color={colors.textTertiary} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {isSearching && (
                <TouchableOpacity onPress={() => { setIsSearching(false); setSearchQ(''); searchRef.current?.blur(); }}>
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

              {/* Near me */}
              <TouchableOpacity
                style={styles.nearMeCard}
                onPress={() => router.push('/nearby')}
                activeOpacity={0.9}
              >
                <View style={styles.nearMeIcon}>
                  <Ionicons name="navigate" size={20} color={colors.white} />
                </View>
                <View style={{ flex: 1 }}>
                  <RText variant="titleMedium">Near Me</RText>
                  <Caption color={colors.textSecondary}>Great food around you right now</Caption>
                </View>
                <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
              </TouchableOpacity>

              {/* Craving something — curated Malaysian dishes */}
              <View style={styles.sectionHeader}>
                <RText variant="h4">Craving something?</RText>
                <Caption color={colors.textSecondary}>Malaysian favourites</Caption>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cravingRow}>
                {POPULAR_MY_DISHES.map(d => (
                  <TouchableOpacity
                    key={d.name}
                    onPress={() => openDishByName(d.name)}
                    activeOpacity={0.85}
                  >
                    <LinearGradient colors={d.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cravingCard}>
                      <RText style={{ fontSize: 30, lineHeight: 36 }}>{d.emoji}</RText>
                      <RText style={styles.cravingLabel} numberOfLines={2}>{d.name}</RText>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category grid */}
              <View style={styles.sectionHeader}>
                <RText variant="h4">By Category</RText>
                <Caption color={colors.textSecondary}>in {city}</Caption>
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
                          {dish.average_rating > 0 && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                              <RText style={{ fontSize: 10, lineHeight: 14 }}>⭐</RText>
                              <RText style={{ fontSize: 11, color: colors.white, fontWeight: '700', marginLeft: 2 }}>
                                {dish.average_rating.toFixed(1)}
                              </RText>
                            </View>
                          )}
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

              {catLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
              ) : (categoryRestaurants ?? []).length === 0 ? (
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
                  {(categoryRestaurants ?? []).map(r => (
                    <View key={r.id} style={styles.restaurantGridItem}>
                      <RestaurantCard restaurant={r} />
                    </View>
                  ))}
                </View>
              )}
            </>
          )}

          {view === 'dish' && activeDish && (
            <>
              <Caption color={colors.textSecondary} style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[4] }}>
                Top spots serving {activeDish.name} · ranked by dish rating
              </Caption>

              {dishLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
              ) : (dishRestaurants ?? []).length === 0 ? (
                <View style={styles.emptyState}>
                  <RText style={{ fontSize: 40, lineHeight: 52 }}>🍽️</RText>
                  <RText variant="titleMedium" style={{ marginTop: spacing[4] }}>
                    No ratings for {activeDish.name} yet
                  </RText>
                  <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 260 }}>
                    Rate this dish at a restaurant to get it started!
                  </Caption>
                </View>
              ) : (
                <View style={styles.dishHeroList}>
                  {(dishRestaurants ?? []).map((entry, idx) => (
                    <DishHeroCard
                      key={entry.id}
                      entry={entry}
                      rank={idx + 1}
                    />
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

      {/* Bottom content */}
      <View style={styles.dishHeroContent}>
        <RText variant="h3" color={colors.white} numberOfLines={1}>{restaurant.name}</RText>
        <View style={styles.dishHeroMeta}>
          <View style={styles.dishHeroScore}>
            <RText style={{ fontSize: 13, lineHeight: 17 }}>⭐</RText>
            <RText style={{ fontSize: 15, fontWeight: '800', color: colors.white, marginLeft: 4 }}>
              {score > 0 ? score.toFixed(1) : '—'}
            </RText>
            {entry.rating_count > 0 && (
              <RText style={{ fontSize: 12, color: colors.whiteTransparent80, marginLeft: 4 }}>
                ({entry.rating_count})
              </RText>
            )}
          </View>
          <RText variant="bodySmall" color={colors.whiteTransparent80} numberOfLines={1} style={{ flex: 1 }}>
            {restaurant.area ?? restaurant.city} · {restaurant.category?.replace(/_/g, ' ')}
          </RText>
        </View>
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
  if (isLoading) return <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />;
  if (!results) return null;

  const hasRestaurants = results.restaurants?.length > 0;
  const hasUsers = results.users?.length > 0;

  if (!hasRestaurants && !hasUsers) {
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
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {hasRestaurants && (
        <View style={styles.searchSection}>
          <RText variant="labelSmall" color={colors.textTertiary} style={styles.searchSectionTitle}>
            RESTAURANTS
          </RText>
          {results.restaurants.map((r: any) => (
            <TouchableOpacity
              key={r.objectID}
              style={styles.searchResultRow}
              onPress={() => router.push(`/restaurant/${r.objectID}`)}
            >
              <View style={styles.searchResultIcon}>
                <Ionicons name="restaurant" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <RText variant="titleSmall">{r.name}</RText>
                <Caption>{r.area ?? r.city} · {r.category}</Caption>
              </View>
              <RText variant="labelMedium" color={colors.textSecondary}>
                ⭐ {r.overall_rating?.toFixed(1)}
              </RText>
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
    height: 172,
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
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
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
