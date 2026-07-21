import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
  Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { colors, spacing, radius, shadows, gradients } from '@/theme';
import { useTheme } from '@/theme/ThemeProvider';
import { RText, Caption } from '@/components/ui/Text';
import { scoreColor } from '@/components/profile/ReviewCard';
import { Avatar } from '@/components/ui/Avatar';
import type { FeedItem } from '@/types';
import { likeReview, unlikeReview, saveRestaurant, unsaveRestaurant } from '@/services/restaurants';
import { shareViaWhatsApp } from '@/lib/share';
import { useAuthStore } from '@/stores/authStore';
import { useReviewedRestaurantIds } from '@/hooks/useReviewedRestaurants';
import { toast } from '@/stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH;
const PHOTO_HEIGHT = 220;

interface FeedCardProps {
  item: FeedItem;
  onLike?: (reviewId: string, liked: boolean) => void;
}

export function FeedCard({ item, onLike }: FeedCardProps) {
  const { profile } = useAuthStore();
  const reviewedIds = useReviewedRestaurantIds();
  const hasVisited = item.restaurant ? reviewedIds.has(item.restaurant.id) : false;
  const [isLiked, setIsLiked] = useState(item.review?.is_liked ?? false);
  const [likeCount, setLikeCount] = useState(item.review?.like_count ?? 0);
  const [isSaved, setIsSaved] = useState(false);

  const handleLike = async () => {
    if (!profile || !item.review || item.actor.id === profile.id) return;
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
    if (hasVisited) {
      toast.info("You've already reviewed this place — it's in your completed list.");
      return;
    }
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

  const navigateToComments = () => {
    if (item.review?.id) router.push(`/review/${item.review.id}`);
    else if (item.restaurant) router.push(`/restaurant/${item.restaurant.id}`);
  };

  const timeAgo = formatDistanceToNow(new Date(item.created_at), { addSuffix: true });

  if (item.type === 'review' || item.type === 'visit') {
    return <ReviewFeedCard
      item={item}
      isLiked={isLiked}
      likeCount={likeCount}
      isSaved={isSaved}
      hasVisited={hasVisited}
      onLike={handleLike}
      onShare={handleShare}
      onSave={handleSave}
      onNavigateRestaurant={navigateToRestaurant}
      onNavigateComments={navigateToComments}
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
  item, isLiked, likeCount, isSaved, hasVisited, onLike, onShare, onSave, onNavigateRestaurant, onNavigateComments, onNavigateUser, timeAgo,
}: {
  item: FeedItem;
  isLiked: boolean;
  likeCount: number;
  isSaved: boolean;
  hasVisited: boolean;
  onLike: () => void;
  onShare: () => void;
  onSave: () => void;
  onNavigateRestaurant: () => void;
  onNavigateComments: () => void;
  onNavigateUser: () => void;
  timeAgo: string;
}) {
  const theme = useTheme();
  // Only the reviewer's OWN photos — never the restaurant's stock cover — so the
  // feed reads like real posts, and no-photo reviews get a clean branded card.
  const photos = item.review?.photos ?? [];
  const userPhoto = photos[0];
  const rating = item.review?.rating ?? 0;

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

      {/* The reviewer's photo (IG-post style) — or a clean branded card if none */}
      <View>
        {userPhoto ? (
          <View style={styles.photoContainer}>
            {photos.length > 1 ? (
              <FeedPhotoCarousel photos={photos} onPressPhoto={onNavigateRestaurant} />
            ) : (
              <Pressable onPress={onNavigateRestaurant} style={styles.photo}>
                <Image
                  source={{ uri: userPhoto }}
                  style={styles.photo}
                  contentFit="cover"
                  transition={300}
                />
              </Pressable>
            )}
            <LinearGradient
              colors={['transparent', 'rgba(0,0,0,0.7)']}
              style={styles.photoGradient}
              pointerEvents="none"
            />
            {/* Restaurant info overlay */}
            <View style={styles.photoOverlay} pointerEvents="none">
              <View style={styles.photoOverlayContent}>
                <RText variant="h4" color={colors.white} numberOfLines={1}>
                  {item.restaurant?.name}
                </RText>
                <View style={styles.ratingRow}>
                  {rating ? (
                    <View style={styles.ratingBadge}>
                      <RText style={{ fontSize: 13, lineHeight: 17 }}>⭐</RText>
                      <RText style={{ fontSize: 15, fontWeight: '800', color: colors.white, marginLeft: 4 }}>
                        {rating % 1 === 0 ? rating : rating.toFixed(1)}
                      </RText>
                    </View>
                  ) : null}
                  <Caption color={colors.whiteTransparent80}>
                    {item.restaurant?.category?.replace(/_/g, ' ')}
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
          <Pressable onPress={onNavigateRestaurant}>
            <NoPhotoBanner
              name={item.restaurant?.name}
              rating={rating}
              category={item.restaurant?.category}
            />
          </Pressable>
        )}
      </View>

      {/* Review content */}
      {item.review?.content && (
        <View style={styles.reviewContent}>
          <RText variant="bodyMedium" color={colors.textPrimary} numberOfLines={userPhoto ? 3 : 5}>
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
            color={isLiked ? theme.primary : colors.textSecondary}
          />
          {likeCount > 0 && (
            <RText variant="labelMedium" color={isLiked ? theme.primary : colors.textSecondary} style={{ marginLeft: 5 }}>
              {likeCount}
            </RText>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtn} activeOpacity={0.7} onPress={onNavigateComments}>
          <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
          {(item.review?.comment_count ?? 0) > 0 && (
            <RText variant="labelMedium" color={colors.textSecondary} style={{ marginLeft: 5 }}>
              {item.review?.comment_count}
            </RText>
          )}
        </TouchableOpacity>

        <View style={{ flex: 1 }} />

        <TouchableOpacity style={styles.actionBtn} onPress={onShare} activeOpacity={0.7}>
          <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
        </TouchableOpacity>

        {hasVisited ? (
          <View style={[styles.actionBtn, styles.visitedChip]}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <RText variant="labelSmall" color={colors.success} style={{ marginLeft: 4, fontWeight: '700' }}>
              Been
            </RText>
          </View>
        ) : (
          <TouchableOpacity style={styles.actionBtn} onPress={onSave} activeOpacity={0.7}>
            <Ionicons
              name={isSaved ? 'bookmark' : 'bookmark-outline'}
              size={20}
              color={isSaved ? theme.primary : colors.textSecondary}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Separator */}
      <View style={styles.separator} />
    </View>
  );
}

// Horizontal, swipeable carousel of the reviewer's photos (IG-style) with page
// dots. Each image is a Pressable so a tap still opens the restaurant while
// horizontal swipes page through the photos.
function FeedPhotoCarousel({ photos, onPressPhoto }: { photos: string[]; onPressPhoto: () => void }) {
  const [idx, setIdx] = useState(0);
  return (
    <>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={(e) => setIdx(Math.round(e.nativeEvent.contentOffset.x / CARD_WIDTH))}
        scrollEventThrottle={16}
      >
        {photos.map((p, i) => (
          <Pressable key={i} onPress={onPressPhoto}>
            <Image source={{ uri: p }} style={styles.carouselPhoto} contentFit="cover" transition={200} />
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.carouselDots} pointerEvents="none">
        {photos.map((_, i) => (
          <View key={i} style={[styles.carouselDot, i === idx && styles.carouselDotActive]} />
        ))}
      </View>
    </>
  );
}

// Clean, standard card for reviews without a photo — restaurant name + score,
// no fake image, no stray icon. Lets the review text carry the card.
function NoPhotoBanner({ name, rating, category }: {
  name?: string;
  rating: number;
  category?: string;
}) {
  return (
    <View style={styles.noPhoto}>
      <View style={{ flex: 1, marginRight: spacing[3] }}>
        <RText variant="h4" color={colors.textPrimary} numberOfLines={2}>{name ?? 'Restaurant'}</RText>
        {category ? (
          <Caption color={colors.textSecondary} style={{ marginTop: 2 }}>
            {category.replace(/_/g, ' ')}
          </Caption>
        ) : null}
      </View>
      {rating > 0 && (
        <View style={[styles.noPhotoBadge, { backgroundColor: scoreColor(rating) }]}>
          <RText style={{ fontSize: 18, fontWeight: '800', color: colors.white, lineHeight: 22 }}>
            {rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)}
          </RText>
          <Ionicons name="star" size={9} color={colors.whiteTransparent90} style={{ marginTop: -2 }} />
        </View>
      )}
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
        <RText style={{ fontSize: 40, lineHeight: 52 }}>{(item.badge as { icon_emoji?: string } | undefined)?.icon_emoji ?? '🏅'}</RText>
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
    gap: spacing[2],
  },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
  },
  photoPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  carouselPhoto: {
    width: CARD_WIDTH,
    height: PHOTO_HEIGHT,
  },
  carouselDots: {
    position: 'absolute',
    top: spacing[3],
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing[1],
  },
  carouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  carouselDotActive: { backgroundColor: colors.white, width: 16 },
  noPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    minHeight: 88,
    backgroundColor: colors.gray50,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  noPhotoBadge: {
    width: 46,
    height: 46,
    borderRadius: radius.lg,
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
  visitedChip: {
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing[2],
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
