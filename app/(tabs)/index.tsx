import React, { useCallback, useRef } from 'react';
import {
  View, StyleSheet, RefreshControl, TouchableOpacity, ScrollView, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows } from '@/theme';
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

const HEADER_HEIGHT = 56;

export default function HomeScreen() {
  const { profile } = useAuthStore();
  const { halalOnly, toggleHalalOnly } = useSettingsStore();
  const qc = useQueryClient();
  const scrollY = useRef(new Animated.Value(0)).current;

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
  };

  const handleRefresh = useCallback(() => {
    refetch();
    qc.invalidateQueries({ queryKey: queryKeys.recommendations(profile?.id ?? '') });
  }, [refetch, qc, profile?.id]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <RText style={styles.logo}>
          rasa
          <RText style={[styles.logo, { color: colors.primary }]}>.</RText>
        </RText>

        <View style={styles.headerRight}>
          {/* Halal toggle */}
          <TouchableOpacity
            style={[styles.halalBtn, halalOnly && styles.halalBtnActive]}
            onPress={handleHalalToggle}
            activeOpacity={0.8}
          >
            <RText style={{ fontSize: 13 }}>🟢</RText>
            <RText style={[styles.halalLabel, halalOnly && styles.halalLabelActive]}>
              Halal
            </RText>
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
            <Caption color={colors.primary}>
              {isFetchingNextPage ? 'Loading...' : 'Load more'}
            </Caption>
          </TouchableOpacity>
        )}

        <View style={{ height: spacing[10] }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function EmptyFeed() {
  return (
    <View style={styles.empty}>
      <RText style={{ fontSize: 48 }}>🍜</RText>
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

  // Header
  header: {
    height: HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
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
  halalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  halalBtnActive: {
    borderColor: colors.halal,
    backgroundColor: colors.halalBg,
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
