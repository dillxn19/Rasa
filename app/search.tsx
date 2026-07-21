import React, { useState, useRef, useCallback } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption, H4 } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import { Avatar } from '@/components/ui/Avatar';
import { multiSearch } from '@/lib/algolia';
import { queryKeys } from '@/lib/queryClient';
import { useSettingsStore } from '@/stores/settingsStore';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import type { AlgoliaRestaurant } from '@/types';
import { CATEGORY_LABELS } from '@/types';

type SearchTab = 'places' | 'people';

const QUICK_SEARCHES = [
  { emoji: '🍜', label: 'Nasi Lemak', q: 'nasi lemak' },
  { emoji: '🥘', label: 'Char Kway Teow', q: 'char kway teow' },
  { emoji: '☕', label: 'Teh Tarik', q: 'teh tarik mamak' },
  { emoji: '🍢', label: 'Satay', q: 'satay' },
  { emoji: '🍵', label: 'Cendol', q: 'cendol' },
  { emoji: '🫕', label: 'Laksa', q: 'laksa' },
  { emoji: '🥐', label: 'Roti Canai', q: 'roti canai' },
  { emoji: '🍖', label: 'Bak Kut Teh', q: 'bak kut teh' },
];

const CATEGORY_SHORTCUTS = [
  { emoji: '🍜', label: 'Hawker', filter: 'hawker' },
  { emoji: '☕', label: 'Mamak', filter: 'mamak' },
  { emoji: '☕', label: 'Cafe', filter: 'cafe' },
  { emoji: '🥚', label: 'Kopitiam', filter: 'kopitiam' },
  { emoji: '🥂', label: 'Fine Dining', filter: 'fine_dining' },
  { emoji: '🌙', label: 'Night Market', filter: 'night_market' },
];

export default function SearchScreen() {
  const { halalOnly, selectedCity } = useSettingsStore();
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<SearchTab>('places');
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleQueryChange = useCallback((text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQuery(text), 250);
  }, []);

  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setQuery('');
    setDebouncedQuery('');
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // Places search (Algolia)
  const { data: placeResults, isLoading: placesLoading } = useQuery({
    queryKey: queryKeys.search(debouncedQuery),
    queryFn: () => multiSearch(debouncedQuery),
    enabled: debouncedQuery.length >= 2 && activeTab === 'places',
    staleTime: 1000 * 30,
  });

  // Saved IDs for bookmark indicator
  const { data: savedIds } = useQuery({
    queryKey: ['userSavedIds', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('saved_restaurants')
        .select('restaurant_id')
        .eq('user_id', profile!.id);
      return new Set((data ?? []).map((r: { restaurant_id: string }) => r.restaurant_id));
    },
    enabled: !!profile,
    staleTime: 60_000,
  });

  // People search (direct Supabase — no Algolia index needed)
  const { data: peopleResults = [], isLoading: peopleLoading } = useQuery({
    queryKey: ['searchPeople', debouncedQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, city, total_reviews, taste_profile')
        .or(`display_name.ilike.%${debouncedQuery}%,username.ilike.%${debouncedQuery}%`)
        .eq('is_active', true)
        .neq('id', profile?.id ?? '')
        .order('total_reviews', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: debouncedQuery.length >= 2 && activeTab === 'people',
    staleTime: 1000 * 30,
  });

  const hasQuery = debouncedQuery.length >= 2;
  const isLoading = activeTab === 'places' ? placesLoading : peopleLoading;
  const hasPlaceResults = placeResults && (placeResults.restaurants.length > 0 || placeResults.users.length > 0);
  const hasPeopleResults = peopleResults.length > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.searchBar}>
          <Ionicons name="search" size={18} color={colors.textTertiary} />
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={activeTab === 'places'
              ? (halalOnly ? 'Halal restaurants, dishes...' : 'Restaurants, dishes...')
              : 'Search by name or @username'}
            placeholderTextColor={colors.textTertiary}
            value={query}
            onChangeText={handleQueryChange}
            autoFocus
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {isLoading && <ActivityIndicator size="small" color={colors.primary} />}
        </View>
      </View>

      {/* Tab switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'places' && styles.tabActive]}
          onPress={() => handleTabChange('places')}
        >
          <Ionicons
            name="restaurant"
            size={14}
            color={activeTab === 'places' ? colors.primary : colors.textTertiary}
            style={{ marginRight: spacing[1] }}
          />
          <RText
            variant="labelMedium"
            color={activeTab === 'places' ? colors.primary : colors.textTertiary}
            style={{ fontWeight: activeTab === 'places' ? '700' : '500' }}
          >
            Places
          </RText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'people' && styles.tabActive]}
          onPress={() => handleTabChange('people')}
        >
          <Ionicons
            name="people"
            size={14}
            color={activeTab === 'people' ? colors.primary : colors.textTertiary}
            style={{ marginRight: spacing[1] }}
          />
          <RText
            variant="labelMedium"
            color={activeTab === 'people' ? colors.primary : colors.textTertiary}
            style={{ fontWeight: activeTab === 'people' ? '700' : '500' }}
          >
            People
          </RText>
        </TouchableOpacity>
      </View>

      {halalOnly && activeTab === 'places' && (
        <View style={styles.halalBar}>
          <RText style={{ fontSize: 12 }}>🟢</RText>
          <Caption color={colors.halal} style={{ marginLeft: spacing[2], fontWeight: '600' }}>
            Showing halal certified only
          </Caption>
        </View>
      )}

      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* ── PLACES TAB ── */}
        {activeTab === 'places' && (
          !hasQuery ? (
            <>
              <View style={styles.section}>
                <H4 style={{ paddingHorizontal: spacing[4], marginBottom: spacing[3] }}>Popular Dishes</H4>
                <View style={styles.quickGrid}>
                  {QUICK_SEARCHES.map(qs => (
                    <TouchableOpacity
                      key={qs.q}
                      style={styles.quickChip}
                      onPress={() => { setQuery(qs.label); setDebouncedQuery(qs.q); }}
                    >
                      <RText style={{ fontSize: 18 }}>{qs.emoji}</RText>
                      <RText variant="labelMedium" style={{ marginTop: spacing[1] }}>{qs.label}</RText>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.section}>
                <H4 style={{ paddingHorizontal: spacing[4], marginBottom: spacing[3] }}>Browse by Type</H4>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
                  {CATEGORY_SHORTCUTS.map(cat => (
                    <TouchableOpacity
                      key={cat.filter}
                      style={styles.categoryChip}
                      onPress={() => router.push({ pathname: '/(tabs)/explore', params: { category: cat.filter } })}
                    >
                      <RText style={{ fontSize: 20 }}>{cat.emoji}</RText>
                      <RText variant="labelMedium" style={{ marginTop: spacing[1] }}>{cat.label}</RText>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </>
          ) : isLoading ? (
            <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /></View>
          ) : !hasPlaceResults ? (
            <View style={styles.emptyState}>
              <RText style={{ fontSize: 48, lineHeight: 58 }}>🔍</RText>
              <RText variant="titleLarge" style={{ marginTop: spacing[4] }}>No results</RText>
              <Caption style={{ marginTop: spacing[2] }} align="center">
                Try "nasi lemak", "char kway teow",{'\n'}or a restaurant name
              </Caption>
            </View>
          ) : (
            <>
              {placeResults!.restaurants.length > 0 && (
                <View style={styles.section}>
                  <Caption style={styles.sectionLabel}>RESTAURANTS</Caption>
                  {placeResults!.restaurants.map(r => (
                    <RestaurantResultRow key={r.objectID} restaurant={r} isSaved={savedIds?.has(r.objectID)} />
                  ))}
                </View>
              )}
            </>
          )
        )}

        {/* ── PEOPLE TAB ── */}
        {activeTab === 'people' && (
          !hasQuery ? (
            <View style={styles.emptyState}>
              <RText style={{ fontSize: 40, lineHeight: 52 }}>👥</RText>
              <RText variant="titleMedium" style={{ marginTop: spacing[4] }}>Find food lovers</RText>
              <Caption style={{ marginTop: spacing[2] }} align="center" color={colors.textSecondary}>
                Search by name or @username to{'\n'}discover and follow people
              </Caption>
            </View>
          ) : isLoading ? (
            <View style={styles.loadingState}><ActivityIndicator color={colors.primary} /></View>
          ) : !hasPeopleResults ? (
            <View style={styles.emptyState}>
              <RText style={{ fontSize: 48, lineHeight: 58 }}>🔍</RText>
              <RText variant="titleLarge" style={{ marginTop: spacing[4] }}>No one found</RText>
              <Caption style={{ marginTop: spacing[2] }} align="center">
                Try searching by display name{'\n'}or @username
              </Caption>
            </View>
          ) : (
            <View style={styles.section}>
              <Caption style={styles.sectionLabel}>PEOPLE</Caption>
              {peopleResults.map((u: any) => (
                <TouchableOpacity
                  key={u.id}
                  style={styles.userRow}
                  onPress={() => router.push(`/user/${u.username}`)}
                >
                  <Avatar uri={u.avatar_url} name={u.display_name} size="md" />
                  <View style={{ flex: 1, marginLeft: spacing[3] }}>
                    <RText variant="titleSmall">{u.display_name}</RText>
                    <Caption color={colors.textSecondary}>@{u.username} · {u.city} · {u.total_reviews} reviews</Caption>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                </TouchableOpacity>
              ))}
            </View>
          )
        )}

        <View style={{ height: spacing[20] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function RestaurantResultRow({ restaurant, isSaved }: { restaurant: AlgoliaRestaurant; isSaved?: boolean }) {
  const isHalal = restaurant.dietary_options?.includes('halal_certified');
  return (
    <TouchableOpacity
      style={styles.restaurantRow}
      onPress={() => router.push(`/restaurant/${restaurant.objectID}`)}
    >
      {restaurant.cover_photo_url ? (
        <Image source={{ uri: restaurant.cover_photo_url }} style={styles.restaurantThumb} contentFit="cover" />
      ) : (
        <View style={[styles.restaurantThumb, styles.thumbFallback]}>
          <Ionicons name="restaurant" size={20} color={colors.gray300} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.restaurantNameRow}>
          <RText variant="titleSmall" numberOfLines={1} style={{ flex: 1 }}>{restaurant.name}</RText>
          {isSaved && <Ionicons name="bookmark" size={14} color={colors.accent} />}
          {isHalal && (
            <View style={styles.halalBadge}>
              <Caption color={colors.halal} style={{ fontWeight: '800', fontSize: 9 }}>HALAL</Caption>
            </View>
          )}
        </View>
        <Caption numberOfLines={1}>
          {CATEGORY_LABELS[restaurant.category] ?? restaurant.category} · {restaurant.area ?? restaurant.city} · {restaurant.price_range}
        </Caption>
        <StarRating value={restaurant.overall_rating} size={12} readonly compact />
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} style={{ marginLeft: spacing[2] }} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing[1] },
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
  input: { flex: 1, fontSize: 16, color: colors.textPrimary, padding: 0 },

  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },

  halalBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    backgroundColor: colors.halalBg,
  },

  section: { paddingTop: spacing[5], paddingBottom: spacing[2] },
  sectionLabel: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    letterSpacing: 0.8,
    color: colors.textTertiary,
    fontWeight: '600',
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  quickChip: {
    width: '22%',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    paddingVertical: spacing[3],
    ...(shadows.xs as object),
  },

  categoryRow: { paddingHorizontal: spacing[4], gap: spacing[3] },
  categoryChip: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    minWidth: 80,
    ...(shadows.xs as object),
  },

  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  restaurantThumb: { width: 52, height: 52, borderRadius: radius.lg },
  thumbFallback: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  restaurantNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: 2 },
  halalBadge: {
    backgroundColor: colors.halalBg,
    borderRadius: radius.xs,
    paddingHorizontal: spacing[1],
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: colors.halal,
  },

  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  loadingState: { alignItems: 'center', paddingTop: spacing[16] },
  emptyState: { alignItems: 'center', paddingTop: spacing[16], paddingHorizontal: spacing[8] },
});
