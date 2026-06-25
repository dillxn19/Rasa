import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  ActivityIndicator, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { RestaurantCard, RestaurantHeroCard } from '@/components/restaurants/RestaurantCard';
import { DishDiscoverySection, DishHeroCard } from '@/components/dishes/DishCard';
import { TrailCard } from '@/components/trails/TrailCard';
import { TimeAwareBanner } from '@/components/ui/TimeAwareBanner';
import { useAuthStore } from '@/stores/authStore';
import { getExploreRestaurants, getTrendingRestaurants } from '@/services/restaurants';
import { getFeaturedDishes, getDishesByMealTime } from '@/services/dishes';
import { getFoodTrails } from '@/services/trails';
import { multiSearch } from '@/lib/algolia';
import { queryKeys } from '@/lib/queryClient';
import type { RestaurantCategory } from '@/types';
import { MALAYSIA_CITIES, CATEGORY_LABELS, getCurrentMealTime } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabKey = 'restaurants' | 'dishes' | 'trails';

const CATEGORIES: { key: RestaurantCategory | 'all'; label: string; emoji: string }[] = [
  { key: 'all', label: 'All', emoji: '🍴' },
  { key: 'hawker', label: 'Hawker', emoji: '🍜' },
  { key: 'mamak', label: 'Mamak', emoji: '☕' },
  { key: 'cafe', label: 'Cafe', emoji: '☕' },
  { key: 'kopitiam', label: 'Kopitiam', emoji: '🥚' },
  { key: 'fine_dining', label: 'Fine Dining', emoji: '🥂' },
  { key: 'food_court', label: 'Food Court', emoji: '🍱' },
  { key: 'night_market', label: 'Night Market', emoji: '🌙' },
];

export default function ExploreScreen() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('restaurants');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCity, setSelectedCity] = useState(profile?.city ?? 'Kuala Lumpur');
  const [selectedCategory, setSelectedCategory] = useState<RestaurantCategory | 'all'>('all');
  const searchRef = useRef<TextInput>(null);
  const currentMealTime = getCurrentMealTime();

  // Restaurants data
  const { data: trendingData } = useQuery({
    queryKey: ['trending', selectedCity],
    queryFn: () => getTrendingRestaurants(selectedCity, 8),
    enabled: activeTab === 'restaurants',
  });

  const { data: exploreData, isLoading: exploreLoading } = useQuery({
    queryKey: ['explore', selectedCity, selectedCategory],
    queryFn: () => getExploreRestaurants(selectedCity),
    enabled: activeTab === 'restaurants',
  });

  // Dishes data
  const { data: featuredDishes } = useQuery({
    queryKey: queryKeys.featuredDishes(),
    queryFn: getFeaturedDishes,
    enabled: activeTab === 'dishes',
  });

  const { data: mealTimeDishes } = useQuery({
    queryKey: queryKeys.dishesByMealTime(currentMealTime),
    queryFn: () => getDishesByMealTime(currentMealTime, 10),
    enabled: activeTab === 'dishes',
  });

  // Trails data
  const { data: featuredTrails, isLoading: trailsLoading } = useQuery({
    queryKey: queryKeys.featuredTrails(),
    queryFn: () => getFoodTrails({ city: selectedCity, featured: true, userId: profile?.id }),
    enabled: activeTab === 'trails',
  });

  const { data: allTrails } = useQuery({
    queryKey: queryKeys.trailsByCity(selectedCity),
    queryFn: () => getFoodTrails({ city: selectedCity, userId: profile?.id }),
    enabled: activeTab === 'trails',
  });

  // Search
  const { data: searchResults, isLoading: isSearchLoading } = useQuery({
    queryKey: queryKeys.search(searchQuery),
    queryFn: () => multiSearch(searchQuery),
    enabled: searchQuery.length >= 2,
  });

  const handleCancelSearch = () => {
    setIsSearching(false);
    setSearchQuery('');
    searchRef.current?.blur();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Search bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => { setIsSearching(true); searchRef.current?.focus(); }}
          activeOpacity={1}
        >
          <Ionicons name="search" size={20} color={colors.textSecondary} />
          <TextInput
            ref={searchRef}
            style={styles.searchInput}
            placeholder={activeTab === 'dishes' ? 'Search dishes...' : activeTab === 'trails' ? 'Search trails...' : 'Restaurants, people, lists...'}
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setIsSearching(true)}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={handleCancelSearch}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </TouchableOpacity>
        {isSearching && (
          <TouchableOpacity onPress={handleCancelSearch}>
            <RText variant="bodyMedium" color={colors.primary} style={{ marginLeft: spacing[3] }}>
              Cancel
            </RText>
          </TouchableOpacity>
        )}
      </View>

      {/* Search results */}
      {isSearching && searchQuery.length >= 2 ? (
        <SearchResultsView results={searchResults} isLoading={isSearchLoading} query={searchQuery} activeTab={activeTab} />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[1]}>
          {/* Time-aware banner */}
          <View style={{ paddingBottom: spacing[4] }}>
            <TimeAwareBanner onPress={(mealTime) => {
              setActiveTab('dishes');
            }} />
          </View>

          {/* Tab bar (sticky) */}
          <View style={styles.tabBar}>
            {([
              { key: 'restaurants', label: 'Restaurants', emoji: '🍴' },
              { key: 'dishes', label: 'Dishes', emoji: '🍜' },
              { key: 'trails', label: 'Trails', emoji: '🗺️' },
            ] as { key: TabKey; label: string; emoji: string }[]).map(tab => (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, activeTab === tab.key && styles.tabActive]}
                onPress={() => setActiveTab(tab.key)}
              >
                <RText style={{ fontSize: 15 }}>{tab.emoji}</RText>
                <RText
                  variant="labelMedium"
                  color={activeTab === tab.key ? colors.primary : colors.textSecondary}
                  style={{ marginLeft: spacing[1] }}
                >
                  {tab.label}
                </RText>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── Restaurants tab ──────────────────── */}
          {activeTab === 'restaurants' && (
            <View>
              {/* City selector */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
                {MALAYSIA_CITIES.slice(0, 8).map(city => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                    onPress={() => setSelectedCity(city)}
                  >
                    <RText variant="labelMedium" color={selectedCity === city ? colors.white : colors.textSecondary}>
                      {city}
                    </RText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Category tabs */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[styles.categoryTab, selectedCategory === cat.key && styles.categoryTabActive]}
                    onPress={() => setSelectedCategory(cat.key)}
                  >
                    <RText style={{ fontSize: 15 }}>{cat.emoji}</RText>
                    <RText
                      variant="labelMedium"
                      color={selectedCategory === cat.key ? colors.primary : colors.textSecondary}
                      style={{ marginLeft: spacing[2] }}
                    >
                      {cat.label}
                    </RText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Trending */}
              {(trendingData ?? []).length > 0 && (
                <View style={styles.section}>
                  <View style={styles.sectionHeader}>
                    <RText variant="h4">🔥 Trending in {selectedCity}</RText>
                  </View>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRow}>
                    {(trendingData ?? []).map(r => (
                      <RestaurantHeroCard key={r.id} restaurant={r} recommendationLabel="Trending" />
                    ))}
                  </ScrollView>
                </View>
              )}

              {/* All restaurants */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <RText variant="h4">
                    {selectedCategory === 'all' ? 'All Restaurants' : CATEGORY_LABELS[selectedCategory as RestaurantCategory]}
                  </RText>
                  <Caption>{(exploreData ?? []).length} places</Caption>
                </View>
                {exploreLoading ? (
                  <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[8] }} />
                ) : (
                  <View style={styles.grid}>
                    {(exploreData ?? [])
                      .filter(r => selectedCategory === 'all' || r.category === selectedCategory)
                      .map(r => (
                        <View key={r.id} style={styles.gridItem}>
                          <RestaurantCard restaurant={r} />
                        </View>
                      ))
                    }
                  </View>
                )}
              </View>
            </View>
          )}

          {/* ── Dishes tab ───────────────────────── */}
          {activeTab === 'dishes' && (
            <View style={{ paddingBottom: spacing[8] }}>
              {/* Meal-time dishes */}
              <DishDiscoverySection
                title={`🍽 ${currentMealTime.charAt(0).toUpperCase() + currentMealTime.slice(1)} Picks`}
                subtitle="Dishes people love right now"
                dishes={mealTimeDishes ?? []}
              />

              {/* Featured dishes */}
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <View>
                    <RText variant="h4">Malaysian Classics</RText>
                    <Caption>Iconic dishes, rated by locals</Caption>
                  </View>
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRow}>
                  {(featuredDishes ?? []).map(dish => (
                    <View key={dish.id} style={{ width: SCREEN_WIDTH * 0.8 }}>
                      <DishHeroCard dish={dish} />
                    </View>
                  ))}
                </ScrollView>
              </View>
            </View>
          )}

          {/* ── Trails tab ───────────────────────── */}
          {activeTab === 'trails' && (
            <View style={{ paddingBottom: spacing[8] }}>
              {/* City filter */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cityRow}>
                {MALAYSIA_CITIES.slice(0, 8).map(city => (
                  <TouchableOpacity
                    key={city}
                    style={[styles.cityChip, selectedCity === city && styles.cityChipActive]}
                    onPress={() => setSelectedCity(city)}
                  >
                    <RText variant="labelMedium" color={selectedCity === city ? colors.white : colors.textSecondary}>
                      {city}
                    </RText>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {trailsLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
              ) : (
                <>
                  {/* Featured trails */}
                  {(featuredTrails ?? []).length > 0 && (
                    <View style={styles.section}>
                      <View style={styles.sectionHeader}>
                        <RText variant="h4">⭐ Featured Trails</RText>
                      </View>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.heroRow}>
                        {(featuredTrails ?? []).map(trail => (
                          <TrailCard key={trail.id} trail={trail} />
                        ))}
                      </ScrollView>
                    </View>
                  )}

                  {/* All trails */}
                  <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                      <RText variant="h4">All Trails in {selectedCity}</RText>
                      <Caption>{(allTrails ?? []).length} trails</Caption>
                    </View>
                    <View style={styles.trailsGrid}>
                      {(allTrails ?? []).map(trail => (
                        <TrailCard key={trail.id} trail={trail} />
                      ))}
                    </View>
                  </View>
                </>
              )}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

// ─── Search results view ──────────────────────────────────────

function SearchResultsView({
  results, isLoading, query, activeTab,
}: {
  results: any;
  isLoading: boolean;
  query: string;
  activeTab: TabKey;
}) {
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (!results) return null;

  const hasRestaurants = results.restaurants?.length > 0;
  const hasUsers = results.users?.length > 0;
  const hasAny = hasRestaurants || hasUsers;

  if (!hasAny) {
    return (
      <View style={styles.noResults}>
        <RText style={{ fontSize: 40 }}>🔍</RText>
        <RText variant="titleLarge" color={colors.textSecondary} style={{ marginTop: spacing[3] }}>
          No results for "{query}"
        </RText>
        <Caption color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
          Try searching for a dish, restaurant, or person
        </Caption>
      </View>
    );
  }

  return (
    <ScrollView style={styles.searchResults} showsVerticalScrollIndicator={false}>
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
                <Ionicons name="restaurant" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <RText variant="titleMedium">{r.name}</RText>
                <Caption>{r.area ?? r.city} · {r.category}</Caption>
              </View>
              <RText variant="labelMedium" color={colors.textSecondary}>
                ⭐ {r.overall_rating.toFixed(1)}
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
                <Ionicons name="person" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <RText variant="titleMedium">{u.display_name}</RText>
                <Caption>@{u.username} · {u.city}</Caption>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },

  // Tab bar
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.background,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing[4],
    gap: spacing[2],
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: spacing[1],
  },
  tabActive: {
    borderBottomColor: colors.primary,
  },

  // City + category
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
  categoryRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  categoryTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryTabActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },

  // Sections
  section: { paddingBottom: spacing[6] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  heroRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[4],
  },
  grid: { paddingHorizontal: spacing[4] },
  gridItem: { marginBottom: spacing[2] },
  trailsGrid: {
    paddingHorizontal: spacing[4],
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },

  // Search
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  searchResults: { flex: 1 },
  searchSection: { paddingHorizontal: spacing[4], paddingBottom: spacing[4] },
  searchSectionTitle: { paddingVertical: spacing[3] },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  searchResultIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noResults: { alignItems: 'center', paddingTop: spacing[16] },
});
