import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius } from '@/theme';
import { RText, Body, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { ScoreBadge } from '@/components/profile/ReviewCard';
import { getRestaurantReviews, getFriendReviews } from '@/services/restaurants';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore } from '@/stores/authStore';
import type { Review } from '@/types';

/**
 * Expanded "all reviews" for a restaurant. Ordering: friends first, then
 * everyone else by like count (getRestaurantReviews already sorts by like_count).
 */
export default function AllReviewsScreen() {
  const { id: rid } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();

  const { data: reviews, isLoading } = useQuery({
    queryKey: queryKeys.restaurantReviews(rid),
    queryFn: () => getRestaurantReviews(rid),
    enabled: !!rid,
  });

  const { data: friendReviews } = useQuery({
    queryKey: ['friend-reviews', rid],
    queryFn: () => getFriendReviews(rid, profile!.id),
    enabled: !!rid && !!profile,
  });

  // Friends first (by like count), then the rest by like count — deduped.
  const friendIds = new Set((friendReviews ?? []).map(r => r.user_id));
  const sortByLikes = (a: Review, b: Review) => (b.like_count ?? 0) - (a.like_count ?? 0);
  const friendsSorted = [...(friendReviews ?? [])].sort(sortByLikes);
  const others = (reviews ?? []).filter(r => !friendIds.has(r.user_id)); // already like-sorted
  const ordered = [...friendsSorted, ...others];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="titleMedium">All Reviews</RText>
        <View style={styles.headerBtn} />
      </View>

      {isLoading ? (
        <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
      ) : (
        <FlatList
          data={ordered}
          keyExtractor={(r) => r.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <ReviewRow review={item} isFriend={friendIds.has(item.user_id)} />
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <RText style={{ fontSize: 40, lineHeight: 50 }}>🍽️</RText>
              <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No reviews yet</RText>
              <Caption color={colors.textSecondary}>Be the first to rank this spot</Caption>
            </View>
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </SafeAreaView>
  );
}

function ReviewRow({ review, isFriend }: { review: Review; isFriend: boolean }) {
  return (
    <View style={styles.row}>
      <Avatar uri={review.user?.avatar_url} name={review.user?.display_name} size="sm" />
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <View style={styles.nameWrap}>
            <RText variant="titleSmall" numberOfLines={1}>
              {review.user?.display_name ?? 'Anonymous'}
            </RText>
            {isFriend && (
              <View style={styles.friendChip}>
                <Caption color={colors.primary}>Friend</Caption>
              </View>
            )}
          </View>
          <ScoreBadge rating={review.rating} size={40} />
        </View>
        {review.content ? (
          <Body color={colors.textSecondary} style={{ marginTop: spacing[1] }}>
            {review.content}
          </Body>
        ) : null}
        {review.photos && review.photos.length > 0 && (
          <FlatList
            horizontal
            data={review.photos}
            keyExtractor={(p, i) => `${p}-${i}`}
            showsHorizontalScrollIndicator={false}
            style={{ marginTop: spacing[2] }}
            renderItem={({ item }) => (
              <Image source={{ uri: item }} style={styles.photo} contentFit="cover" transition={150} />
            )}
          />
        )}
        {(review.like_count ?? 0) > 0 && (
          <View style={styles.likes}>
            <Ionicons name="heart" size={13} color={colors.textTertiary} />
            <Caption color={colors.textTertiary}> {review.like_count}</Caption>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing[4], paddingBottom: spacing[10] },
  empty: { alignItems: 'center', paddingTop: spacing[16] },
  row: { flexDirection: 'row', gap: spacing[3], marginBottom: spacing[5] },
  rowContent: { flex: 1 },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing[2] },
  nameWrap: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], flex: 1 },
  friendChip: {
    backgroundColor: colors.primarySurface, paddingHorizontal: spacing[2], paddingVertical: 2,
    borderRadius: radius.full,
  },
  photo: { width: 96, height: 96, borderRadius: radius.md, marginRight: spacing[2] },
  likes: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[2] },
});
