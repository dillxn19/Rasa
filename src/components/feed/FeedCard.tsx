import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { colors, spacing, radius, shadows, gradients } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import type { FeedItem } from '@/types';
import { likeReview, unlikeReview, saveRestaurant, unsaveRestaurant } from '@/services/restaurants';
import { shareViaWhatsApp } from '@/lib/share';
import { useAuthStore } from '@/stores/authStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;
const PHOTO_HEIGHT = 320;

interface FeedCardProps {
  item: FeedItem;
  onLike?: (reviewId: string, liked: boolean) => void;
}

export function FeedCard({ item, onLike }: FeedCardProps) {
  const { profile } = useAuthStore();
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(item.review?.like_count ?? 0);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = async () => {
    if (!profile || !item.review) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const newLiked = !isLiked;
    setIsLiked(newLiked);
    setLikeCount(prev => prev + (newLiked ? 1 : -1));

    try {
      if (newLiked) {
        await likeReview(profile.id, item.review.id);
      } else {
        await unlikeReview(profile.id, item.review.id);
      }
      onLike?.(item.review.id, newLiked);
    } catch {
      // Revert on error
      setIsLiked(!newLiked);
      setLikeCount(prev => prev + (newLiked ? -1 : 1));
    }
  };

  const handleShare = async () => {
    if (!item.restaurant) return;
    const rating = item.review?.rating ? ` ⭐ ${item.review.rating}/5` : '';
    await shareViaWhatsApp(`🍜 ${item.restaurant.name}${rating}\n${item.actor.display_name} reviewed this on Rasa!\nrasa.my/restaurant/${item.restaurant.id}`);
  };

  const handleSave = async () => {
    if (!profile || !item.restaurant) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newSaved = !isSaved;
    setIsSaved(newSaved);
    try {
      if (newSaved) await saveRestaurant(profile.id, item.restaurant.id);
      else await unsaveRestaurant(profile.id, item.restaurant.id);
    } catch {
      setIsSaved(!newSaved);
    }
  };

  const navigateToRestaurant = () => {
    if (!item.restaurant) return;
    router.push(`/restaurant/${item.restaurant.id}`);
  };

  const navigateToUser = () => {
    router.push(`/user/${item.actor.username}`);
  };

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

  if (item.type === 'review' || item.type === 'visit') {
    return <ReviewFeedCard
      item={item}
      isLiked={isLiked}
      likeCount={likeCount}
      isSaved={isSaved}
      onLike={handleLike}
      onShare={handleShare}
      onSave={handleSave}
      onNavigateRestaurant={navigateToRestaurant}
      onNavigateUser={navigateToUser}
      timeAgo={timeAgo}
    />;
  }

  if (item.type === 'list_created') {
    return <ListFeedCard item={item} onNavigateUser={navigateToUser} timeAgo={timeAgo} />;
  }

  if (item.type === 'badge_earned') {
    return <BadgeFeedCard item={item} onNavigateUser={navigateToUser} timeAgo={timeAgo} />;
  }

  return null;
}

function ReviewFeedCard({
  item, isLiked, likeCount, isSaved, onLike, onShare, onSave, onNavigateRestaurant, onNavigateUser, timeAgo,
}: {
  item: FeedItem;
  isLiked: boolean;
  likeCount: number;
  isSaved: boolean;
  onLike: () => void;
  onShare: () => void;
  onSave: () => void;
  onNavigateRestaurant: () => void;
  onNavigateUser: () => void;
  timeAgo: string;
}) {
  const photos = item.review?.photos ?? [];
  const coverPhoto = photos[0] ?? item.restaurant?.cover_photo_url;

  return (
    <View style={styles.card}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.userRow} onPress={onNavigateUser} activeOpacity={0.7}>
          <Avatar
            uri={item.actor.avatar_url}
            name={item.actor.display_name}
            size="md"
          />
          <View style={styles.userInfo}>
            <RText variant="titleSmall">{item.actor.display_name}</RText>
            <Caption>
              {item.type === 'review' ? 'reviewed' : 'visited'} · {timeAgo}
            </Caption>
          </View>
        </TouchableOpacity>
        <TouchableOpacity onPress={onShare} style={styles.moreBtn}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {/* Restaurant photo */}
      <TouchableOpacity onPress={onNavigateRestaurant} activeOpacity={0.95}>
        {coverPhoto ? (
          <View style={styles.photoContainer}>
            <Image
              source={{ uri: coverPhoto }}
              style={styles.photo}
              contentFit="cover"
              transition={300}
            />
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.photoGradient}
            />
            {/* Restaurant info overlay */}
            <View style={styles.photoOverlay}>
              <View style={styles.photoOverlayContent}>
                <RText variant="h4" color={colors.white} numberOfLines={1}>
                  {item.restaurant?.name}
                </RText>
                <View style={styles.ratingRow}>
                  {item.review?.rating && (
                    <StarRating
                      value={item.review.rating}
                      size={14}
                      readonly
                      compact
                      color={colors.starFilled}
                    />
                  )}
                  <Caption color={colors.whiteTransparent80} style={{ marginLeft: spacing[2] }}>
                    {item.restaurant?.category?.replace('_', ' ')}
                  </Caption>
                </View>
              </View>
            </View>

            {/* Multiple photos indicator */}
            {photos.length > 1 && (
              <View style={styles.photoCount}>
                <Ionicons name="images-outline" size={14} color={colors.white} />
                <RText variant="caption" color={colors.white} style={{ marginLeft: 3 }}>
                  {photos.length}
                </RText>
              </View>
            )}
          </View>
        ) : (
          <View style={[styles.photoContainer, styles.photoPlaceholder]}>
            <Ionicons name="restaurant-outline" size={48} color={colors.gray300} />
            <RText variant="titleMedium" color={colors.gray400} style={{ marginTop: spacing[2] }}>
              {item.restaurant?.name}
            </RText>
          </View>
        )}
      </TouchableOpacity>

      {/* Review content */}
      {item.review?.content && (
        <View style={styles.reviewContent}>
          <RText variant="bodyMedium" color={colors.textPrimary} numberOfLines={3}>
            "{item.review.content}"
          </RText>
        </View>
      )}

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={onLike} activeOpacity={0.7}>
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={22}
            color={isLiked ? colors.liked : colors.textSecondary}
          />
          {likeCount > 0 && (
            <RText variant="labelMedium" color={isLiked ? colors.liked : colors.textSecondary} style={{ marginLeft: 5 }}>
              {likeCount}
            </RText>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          {(item.review?.comment_count ?? 0) > 0 && (
            <RText variant="labelMedium" color={colors.textSecondary} style={{ marginLeft: 5 }}>
              {item.review?.comment_count}
            </RText>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.7}>
          <RText style={{ fontSize: 16 }}>💬</RText>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} onPress={onSave} activeOpacity={0.7}>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={isSaved ? colors.primary : colors.textSecondary}
          />
        </TouchableOpacity>
      </View>

      {/* Separator */}
      <View style={styles.separator} />
    </View>
  );
}

function ListFeedCard({ item, onNavigateUser, timeAgo }: {
  item: FeedItem;
  onNavigateUser: () => void;
  timeAgo: string;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.userRow} onPress={onNavigateUser} activeOpacity={0.7}>
          <Avatar uri={item.actor.avatar_url} name={item.actor.display_name} size="md" />
          <View style={styles.userInfo}>
            <RText variant="titleSmall">{item.actor.display_name}</RText>
            <Caption>created a new list · {timeAgo}</Caption>
          </View>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.listCard}
        onPress={() => item.list && router.push(`/list/${item.list.id}`)}
        activeOpacity={0.9}
      >
        {item.list && (
          <>
            <View style={styles.listIconContainer}>
              <Ionicons name="list" size={32} color={colors.primary} />
            </View>
            <View style={styles.listInfo}>
              <RText variant="titleLarge">{item.list.title}</RText>
              <Caption>{(item.list as { restaurant_count?: number }).restaurant_count ?? 0} restaurants</Caption>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </>
        )}
      </TouchableOpacity>
      <View style={styles.separator} />
    </View>
  );
}

function BadgeFeedCard({ item, onNavigateUser, timeAgo }: {
  item: FeedItem;
  onNavigateUser: () => void;
  timeAgo: string;
}) {
  return (
    <View style={[styles.card, styles.badgeCard]}>
      <TouchableOpacity style={styles.userRow} onPress={onNavigateUser} activeOpacity={0.7}>
        <Avatar uri={item.actor.avatar_url} name={item.actor.display_name} size="md" />
        <View style={styles.userInfo}>
          <RText variant="titleSmall">
            {item.actor.display_name}
            <RText variant="bodyMedium" color={colors.textSecondary}> earned a badge</RText>
          </RText>
          <Caption>{timeAgo}</Caption>
        </View>
      </TouchableOpacity>

      <View style={styles.badgeDisplay}>
        <RText style={{ fontSize: 40 }}>{(item.badge as { icon_emoji?: string } | undefined)?.icon_emoji ?? '🏅'}</RText>
        <RText variant="titleLarge" style={{ marginTop: spacing[2] }}>{item.badge?.name}</RText>
      </View>
      <View style={styles.separator} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.background,
    width: CARD_WIDTH,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    justifyContent: 'space-between',
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  userInfo: {
    marginLeft: spacing[3],
    flex: 1,
  },
  moreBtn: {
    padding: spacing[2],
  },
  photoContainer: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT,
    backgroundColor: colors.gray100,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  photoOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
  },
  photoOverlayContent: {
    gap: spacing[1],
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoCount: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blackTransparent40,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.full,
  },
  reviewContent: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[2],
    borderRadius: radius.lg,
  },
  separator: {
    height: 8,
    backgroundColor: colors.backgroundSecondary,
  },
  listCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  listIconContainer: {
    width: 56,
    height: 56,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
  },
  listInfo: {
    flex: 1,
  },
  badgeCard: {
    paddingBottom: spacing[4],
  },
  badgeDisplay: {
    alignItems: 'center',
    paddingVertical: spacing[6],
  },
});
