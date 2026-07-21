import React, { useCallback, useRef } from 'react';
import {
  View, StyleSheet, RefreshControl, TouchableOpacity, ScrollView, Animated, Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows } from '@/theme';
import { useTheme } from '@/theme/ThemeProvider';
import { saveUserHalal } from '@/stores/settingsStore';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { FeedCard } from '@/components/feed/FeedCard';
import { ForYouSection, TrendingSection } from '@/components/recommendations/ForYouSection';
import { TimeAwareBanner } from '@/components/ui/TimeAwareBanner';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getHomeFeed } from '@/services/feed';
import { getRecommendations, getTrendingNearby, dismissRecommendation } from '@/services/recommendations';
import { queryKeys } from '@/lib/queryClient';
import type { FeedItem } from '@/types';

const HEADER_CONTENT_HEIGHT = 56;

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const { halalOnly, toggleHalalOnly } = useSettingsStore();
  const theme = useTheme();
  const qc = useQueryClient();
  const scrollY = useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();
  const safeTop = Math.max(insets.top, 44);

  // Recommendations
  const { data: recsData, isLoading: recsLoading } = useQuery({
    queryKey: [...queryKeys.recommendations(profile?.id ?? ''), halalOnly],
    queryFn: () => getRecommendations(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 60 * 5,
  });

  const { data: trendingData } = useQuery({
    queryKey: ['trending-home', profile?.city, halalOnly],
    queryFn: () => getTrendingNearby(profile?.city ?? 'Kuala Lumpur', 8, halalOnly),
    enabled: !!profile,
  });

  // Social feed
  const {
    data: feedData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading: feedLoading,
    refetch,
    isRefetching,
  } = useInfiniteQuery({
    queryKey: queryKeys.homeFeed(),
    queryFn: ({ pageParam = 0 }) => getHomeFeed(profile!.id, pageParam as number),
    getNextPageParam: (lastPage, allPages) =>
      lastPage.length === 20 ? allPages.length : undefined,
    initialPageParam: 0,
    enabled: !!profile,
  });

  const dismissMutation = useMutation({
    mutationFn: (restaurantId: string) => dismissRecommendation(profile!.id, restaurantId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.recommendations(profile?.id ?? '') }),
  });

  const feedItems = feedData?.pages.flat() ?? [];
  const recs = (recsData ?? []).filter(r =>
    !halalOnly || r.restaurant.dietary_options?.includes('halal_certified')
  );
  const trending = (trendingData ?? []);

  const handleHalalToggle = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    toggleHalalOnly();
    if (profile) saveUserHalal(profile.id, !halalOnly);
  };

  const handleRefresh = useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: queryKeys.recommendations(profile?.id ?? '') });
  }, [refetch, qc, profile?.id]);

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: safeTop }]}>
        <RText style={styles.logo}>
          rasa
          <RText style={[styles.logo, { color: theme.primary }]}>.</RText>
        </RText>

        <View style={styles.headerRight}>
          {/* Halal toggle */}
          <View style={styles.halalToggleRow}>
            <RText style={[styles.halalLabel, halalOnly && styles.halalLabelActive]}>Halal</RText>
            <Switch
              value={halalOnly}
              onValueChange={handleHalalToggle}
              trackColor={{ false: colors.gray200, true: colors.halal }}
              thumbColor={colors.white}
              ios_backgroundColor={colors.gray200}
            />
          </View>

          {/* Search */}
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Notifications */}
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => router.push('/(tabs)/activity')}
          >
            <Ionicons name="notifications-outline" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          {/* Avatar */}
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')}>
            <Avatar uri={profile?.avatar_url} name={profile?.display_name} size="sm" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={handleRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        {/* Time-aware banner */}
        <View style={{ paddingTop: spacing[4] }}>
          <TimeAwareBanner />
        </View>

        {/* For You recommendations */}
        {!recsLoading && recs.length > 0 && (
          <ForYouSection
            recs={recs.slice(0, 8)}
            onDismiss={(id) => dismissMutation.mutate(id)}
          />
        )}

        {/* Trending section */}
        {trending.length > 0 && (
          <TrendingSection
            title={`🔥 Trending in ${profile?.city ?? 'KL'}`}
            subtitle={halalOnly ? 'Halal certified only' : 'Most popular this week'}
            restaurants={trending}
          />
        )}

        {/* Divider */}
        <View style={styles.feedDivider}>
          <View style={styles.dividerLine} />
          <RText variant="labelSmall" color={colors.textTertiary} style={styles.dividerLabel}>
            FRIENDS ACTIVITY
          </RText>
          <View style={styles.dividerLine} />
        </View>

        {/* Social feed */}
        {feedItems.length === 0 && !feedLoading ? (
          <EmptyFeed />
        ) : (
          feedItems.map(item => <FeedCard key={item.id} item={item} />)
        )}

        {/* Load more */}
        {hasNextPage && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={() => !isFetchingNextPage && fetchNextPage()}
            disabled={isFetchingNextPage}
          >
            <Caption color={theme.primary}>
              {isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Caption>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </View>
  );
}

function EmptyFeed() {
  return (
    <View style={styles.empty}>
      <RText style={{ fontSize: 48, lineHeight: 58 }}>🍜</RText>
      <RText variant="h3" style={{ marginTop: spacing[4] }}>Your feed is quiet</RText>
      <RText variant="bodyMedium" color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 280 }}>
        Follow food lovers you know to see where they're eating.
      </RText>
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => router.push('/(tabs)/explore')}
      >
        <RText variant="titleMedium" color={colors.white}>Find people to follow →</RText>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header — height set dynamically via paddingTop inline
  header: {
    minHeight: HEADER_CONTENT_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  logo: {
    fontSize: 24,
    fontWeight: '800',
    letterSpacing: -1,
    color: colors.textPrimary,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerBtn: {
    padding: spacing[1],
  },

  // Halal toggle
  halalToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  halalLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
  },
  halalLabelActive: {
    color: colors.halal,
  },

  // Feed divider
  feedDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginVertical: spacing[5],
    gap: spacing[3],
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
  dividerLabel: {
    letterSpacing: 0.8,
  },

  // Empty state
  empty: {
    alignItems: 'center',
    paddingTop: spacing[10],
    paddingHorizontal: spacing[8],
  },
  exploreBtn: {
    marginTop: spacing[6],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    ...(shadows.sm as object),
  },

  // Load more
  loadMoreBtn: {
    alignItems: 'center',
    paddingVertical: spacing[5],
  },
});
