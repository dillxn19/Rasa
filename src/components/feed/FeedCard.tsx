import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { formatDistanceToNow } from 'date-fns';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { ReviewPostCard, type ReviewPost } from '@/components/reviews/ReviewPostCard';
import type { FeedItem } from '@/types';

interface FeedCardProps {
  item: FeedItem;
  onLike?: (reviewId: string, liked: boolean) => void;
}

export function FeedCard({ item, onLike }: FeedCardProps) {
  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

  // Reviews & visits use the shared, standardized review card (identical to the
  // profile Activity tab): square score badge, swipeable photos, likes/comments.
  if (item.type === 'review' || item.type === 'visit') {
    const post: ReviewPost = {
      reviewId: item.review?.id,
      rating: item.review?.rating ?? 0,
      content: item.review?.content,
      photos: item.review?.photos ?? [],
      createdAt: item.created_at,
      likeCount: item.review?.like_count ?? 0,
      commentCount: item.review?.comment_count ?? 0,
      isLiked: item.review?.is_liked ?? false,
      restaurant: item.restaurant
        ? {
            id: item.restaurant.id,
            name: item.restaurant.name,
            slug: (item.restaurant as { slug?: string | null }).slug ?? null,
            category: item.restaurant.category,
            area: (item.restaurant as { area?: string | null }).area ?? null,
            city: item.restaurant.city,
          }
        : null,
      actor: item.actor,
      actionLabel: item.type === 'review' ? 'reviewed' : 'visited',
    };
    return (
      <View>
        <ReviewPostCard post={post} variant="feed" onLike={onLike ? (liked) => item.review && onLike(item.review.id, liked) : undefined} />
        <View style={styles.separator} />
      </View>
    );
  }

  if (item.type === 'list_created') {
    return (
      <View style={styles.wrap}>
        <ListFeedCard item={item} timeAgo={timeAgo} />
      </View>
    );
  }

  if (item.type === 'badge_earned') {
    return (
      <View style={styles.wrap}>
        <BadgeFeedCard item={item} timeAgo={timeAgo} />
      </View>
    );
  }

  return null;
}

function ActorHeader({ item, subtitle }: { item: FeedItem; subtitle: string }) {
  return (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push(`/user/${item.actor.username}`)}
      activeOpacity={0.7}
    >
      <Avatar uri={item.actor.avatar_url} name={item.actor.display_name} size="md" />
      <View style={styles.userInfo}>
        <RText variant="titleSmall">{item.actor.display_name}</RText>
        <Caption>{subtitle}</Caption>
      </View>
    </TouchableOpacity>
  );
}

function ListFeedCard({ item, timeAgo }: { item: FeedItem; timeAgo: string }) {
  return (
    <View style={styles.card}>
      <ActorHeader item={item} subtitle={`created a new list · ${timeAgo}`} />
      <TouchableOpacity
        style={styles.listCard}
        onPress={() => item.list && router.push(`/list/${item.list.id}`)}
        activeOpacity={0.9}
      >
        {item.list && (
          <>
            <View style={styles.listIconContainer}>
              <Ionicons name="list" size={28} color={colors.primary} />
            </View>
            <View style={styles.listInfo}>
              <RText variant="titleLarge" numberOfLines={1}>{item.list.title}</RText>
              <Caption>{(item.list as { restaurant_count?: number }).restaurant_count ?? 0} restaurants</Caption>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

function BadgeFeedCard({ item, timeAgo }: { item: FeedItem; timeAgo: string }) {
  return (
    <View style={styles.card}>
      <ActorHeader item={item} subtitle={`earned a badge · ${timeAgo}`} />
      <View style={styles.badgeDisplay}>
        <RText style={{ fontSize: 40, lineHeight: 52 }}>{(item.badge as { icon_emoji?: string } | undefined)?.icon_emoji ?? '🏅'}</RText>
        <RText variant="titleLarge" style={{ marginTop: spacing[2] }}>{item.badge?.name}</RText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: spacing[4], paddingTop: spacing[3] },
  separator: { height: 8, backgroundColor: colors.backgroundSecondary },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    ...(shadows.xs as object),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  userRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing[3] },
  userInfo: { marginLeft: spacing[3], flex: 1 },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.lg,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  listInfo: { flex: 1 },
  badgeDisplay: { alignItems: 'center', paddingVertical: spacing[4] },
});
