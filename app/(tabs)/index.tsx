import React, { useCallback, useState } from 'react';
import {
  View,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing } from '@/theme';
import { RText } from '@/components/ui/Text';
import { FeedCard } from '@/components/feed/FeedCard';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { getHomeFeed } from '@/services/feed';
import { queryKeys } from '@/lib/queryClient';
import type { FeedItem } from '@/types';

export default function HomeScreen() {
  const { profile } = useAuthStore();

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
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

  const feedItems = data?.pages.flat() ?? [];

  const renderItem = useCallback(({ item }: { item: FeedItem }) => (
    <FeedCard item={item} />
  ), []);

  const keyExtractor = useCallback((item: FeedItem) => item.id, []);

  const renderEmpty = () => (
    <View style={styles.empty}>
      <RText style={{ fontSize: 48 }}>🍜</RText>
      <RText variant="h3" style={{ marginTop: spacing[4] }}>
        Your feed is empty
      </RText>
      <RText variant="bodyMedium" color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 280 }}>
        Follow people you know to see their restaurant discoveries here.
      </RText>
      <TouchableOpacity
        style={styles.exploreBtn}
        onPress={() => router.push('/(tabs)/explore')}
      >
        <RText variant="titleMedium" color={colors.primary}>Find people to follow</RText>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <RText variant="h3" style={{ letterSpacing: -0.5 }}>
          <RText variant="h3" color={colors.primary} style={{ letterSpacing: -0.5 }}>Rasa</RText>
        </RText>

        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push('/(tabs)/activity')}>
            <Avatar uri={profile?.avatar_url} name={profile?.display_name} size="sm" />
          </TouchableOpacity>
        </View>
      </View>

      <FlashList
        data={feedItems}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        estimatedItemSize={440}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.5}
        ListEmptyComponent={!isLoading ? renderEmpty : null}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  headerBtn: {
    padding: spacing[1],
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing[8],
  },
  exploreBtn: {
    marginTop: spacing[6],
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[6],
    borderRadius: 100,
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
});
