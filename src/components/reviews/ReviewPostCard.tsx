import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { formatDistanceToNow } from 'date-fns';
import { useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption, Body } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { PhotoCarousel } from '@/components/ui/PhotoCarousel';
import { ScoreBadge, scoreColor } from '@/components/profile/ReviewCard';
import { SaveToListSheet } from '@/components/lists/SaveToListSheet';
import { ReportSheet } from '@/components/ui/ReportSheet';
import { useAuthStore } from '@/stores/authStore';
import { useReviewedRestaurantIds } from '@/hooks/useReviewedRestaurants';
import { likeReview, unlikeReview, saveRestaurant, unsaveRestaurant } from '@/services/restaurants';
import { shareViaWhatsApp } from '@/lib/share';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/toastStore';
import { CATEGORY_LABELS } from '@/types';

// A single, normalized shape both the feed and the profile "Activity" tab map
// into — so the card looks and behaves identically everywhere.
export interface ReviewPost {
  reviewId?: string;
  rating: number;
  content?: string | null;
  photos?: string[];
  createdAt: string;
  likeCount?: number;
  commentCount?: number;
  isLiked?: boolean;
  restaurant?: {
    id: string;
    name: string;
    slug?: string | null;
    category?: string | null;
    area?: string | null;
    city?: string | null;
  } | null;
  actor: {
    id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
  };
  actionLabel?: string; // 'reviewed' | 'visited'
}

// How many lines of review text to show before the "See more" toggle appears.
const COLLAPSED_LINES = 3;
// Rough length past which a review is treated as "an essay" worth collapsing.
const LONG_TEXT = 150;

/**
 * The standardized review card. Two visual variants share ALL the interaction
 * logic (like / comment / share / add-to-list / save):
 *   • 'card' — clean list card (profile Activity): name + right score badge, then
 *     swipeable photos. (This is the layout the user calls "option 1".)
 *   • 'feed' — Instagram-style: swipeable photo with the restaurant name and the
 *     colour score box overlaid at the bottom-left.
 */
export function ReviewPostCard({
  post,
  variant = 'card',
  showActor = true,
  onLike,
  onDelete,
}: {
  post: ReviewPost;
  variant?: 'card' | 'feed';
  /** Feed shows who posted; a user's own profile hides it (it's obviously them). */
  showActor?: boolean;
  /** Optional callback so the feed can keep its cached like count in sync. */
  onLike?: (liked: boolean) => void;
  /** Long-press to delete (own reviews on the profile). */
  onDelete?: (reviewId: string) => void;
}) {
  const { profile } = useAuthStore();
  const qc = useQueryClient();
  const reviewedIds = useReviewedRestaurantIds();

  const r = post.restaurant;
  const photos = post.photos ?? [];
  const isOwn = profile?.id === post.actor.id;
  const hasVisited = r ? reviewedIds.has(r.id) : false;

  const [isLiked, setIsLiked] = useState(post.isLiked ?? false);
  const [likeCount, setLikeCount] = useState(post.likeCount ?? 0);
  const [isSaved, setIsSaved] = useState(false);
  const [showListSheet, setShowListSheet] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const openRestaurant = () => {
    if (r) router.push(`/restaurant/${r.slug ?? r.id}`);
  };
  const openUser = () => router.push(`/user/${post.actor.username}`);
  const openComments = () => {
    if (post.reviewId) router.push(`/review/${post.reviewId}`);
    else openRestaurant();
  };

  const canLike = !!post.reviewId && !!profile && !isOwn;
  const handleLike = async () => {
    if (!canLike || !post.reviewId || !profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !isLiked;
    setIsLiked(next);
    setLikeCount(c => c + (next ? 1 : -1));
    try {
      if (next) await likeReview(profile.id, post.reviewId);
      else await unlikeReview(profile.id, post.reviewId);
      onLike?.(next);
    } catch {
      setIsLiked(!next);
      setLikeCount(c => c + (next ? -1 : 1));
    }
  };

  const handleSave = async () => {
    if (!profile || !r) return;
    if (hasVisited) {
      toast.info("You've already reviewed this place — it's in your completed list.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !isSaved;
    setIsSaved(next);
    try {
      if (next) await saveRestaurant(profile.id, r.id);
      else await unsaveRestaurant(profile.id, r.id);
      qc.invalidateQueries({ queryKey: queryKeys.savedRestaurants(profile.id) });
      toast.success(next ? 'Saved to Want to try' : 'Removed from Want to try');
    } catch {
      setIsSaved(!next);
      toast.error('Could not update your saves. Try again.');
    }
  };

  const handleShare = async () => {
    if (!r) return;
    const rating = post.rating ? ` ⭐ ${post.rating}/5` : '';
    await shareViaWhatsApp(`🍜 ${r.name}${rating}\n${post.actor.display_name} reviewed this on Rasa!\nrasa.my/restaurant/${r.id}`);
  };

  const timeAgo = formatDistanceToNow(new Date(post.createdAt), { addSuffix: true });
  const categoryLabel = r?.category
    ? (CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] ?? r.category.replace(/_/g, ' '))
    : null;
  const meta = [categoryLabel, r?.area ?? r?.city].filter(Boolean).join(' · ');
  const isLong = (post.content?.length ?? 0) > LONG_TEXT;
  const isFeed = variant === 'feed';

  // ── Actor header (shared) ──
  const Header = showActor ? (
    <View style={[styles.header, isFeed && styles.headerPad]}>
      <TouchableOpacity style={styles.userRow} onPress={openUser} activeOpacity={0.7}>
        <Avatar uri={post.actor.avatar_url} name={post.actor.display_name} size="md" />
        <View style={styles.userInfo}>
          <RText variant="titleSmall">{post.actor.display_name}</RText>
          <Caption>{post.actionLabel ?? 'reviewed'} · {timeAgo}</Caption>
        </View>
      </TouchableOpacity>
      {/* Overflow menu — Report (own posts have nothing to report). */}
      {!isOwn && post.reviewId ? (
        <TouchableOpacity onPress={() => setShowReport(true)} style={styles.moreBtn} hitSlop={8}>
          <Ionicons name="ellipsis-horizontal" size={20} color={colors.textSecondary} />
        </TouchableOpacity>
      ) : null}
    </View>
  ) : null;

  // ── Review text with "See more" ──
  const TextBlock = post.content ? (
    <View style={[isFeed && styles.textPad, { marginTop: spacing[3] }]}>
      <Body color={colors.textPrimary} style={styles.text} numberOfLines={expanded ? undefined : COLLAPSED_LINES}>
        {post.content}
      </Body>
      {isLong && (
        <TouchableOpacity onPress={() => setExpanded(e => !e)} hitSlop={6} activeOpacity={0.7}>
          <RText variant="labelMedium" color={colors.textSecondary} style={{ marginTop: 4 }}>
            {expanded ? 'See less' : 'See more'}
          </RText>
        </TouchableOpacity>
      )}
    </View>
  ) : null;

  // ── Actions row (shared) ──
  const Actions = (
    <View style={[styles.actions, isFeed && styles.actionsPad]}>
      <TouchableOpacity style={styles.actionBtn} onPress={handleLike} disabled={!canLike} activeOpacity={0.7}>
        <Ionicons name={isLiked ? 'heart' : 'heart-outline'} size={22} color={isLiked ? colors.primary : colors.textSecondary} />
        {likeCount > 0 && (
          <RText variant="labelMedium" color={isLiked ? colors.primary : colors.textSecondary} style={{ marginLeft: 5 }}>{likeCount}</RText>
        )}
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={openComments} activeOpacity={0.7}>
        <Ionicons name="chatbubble-outline" size={20} color={colors.textSecondary} />
        {(post.commentCount ?? 0) > 0 && (
          <RText variant="labelMedium" color={colors.textSecondary} style={{ marginLeft: 5 }}>{post.commentCount}</RText>
        )}
      </TouchableOpacity>

      <View style={{ flex: 1 }} />

      <TouchableOpacity style={styles.actionBtn} onPress={handleShare} activeOpacity={0.7}>
        <Ionicons name="share-social-outline" size={20} color={colors.textSecondary} />
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionBtn} onPress={() => setShowListSheet(true)} activeOpacity={0.7}>
        <Ionicons name="add-circle-outline" size={22} color={colors.textSecondary} />
      </TouchableOpacity>

      {hasVisited ? (
        <View style={[styles.actionBtn, styles.visitedChip]}>
          <Ionicons name="checkmark-circle" size={16} color={colors.success} />
          <RText variant="labelSmall" color={colors.success} style={{ marginLeft: 4, fontWeight: '700' }}>Been</RText>
        </View>
      ) : (
        <TouchableOpacity style={styles.actionBtn} onPress={handleSave} activeOpacity={0.7}>
          <Ionicons name={isSaved ? 'bookmark' : 'bookmark-outline'} size={20} color={isSaved ? colors.primary : colors.textSecondary} />
        </TouchableOpacity>
      )}
    </View>
  );

  const ListSheet = (
    <>
      {r && profile ? (
        <SaveToListSheet
          visible={showListSheet}
          userId={profile.id}
          restaurantId={r.id}
          restaurantName={r.name}
          onClose={() => setShowListSheet(false)}
        />
      ) : null}
      {post.reviewId ? (
        <ReportSheet
          visible={showReport}
          target={{ reporterId: profile?.id ?? '', reviewId: post.reviewId }}
          targetLabel="this review"
          onClose={() => setShowReport(false)}
        />
      ) : null}
    </>
  );

  // ─────────────────────────────────────────────────────────────
  // FEED variant (option 2): IG-style media with name + score overlay.
  // ─────────────────────────────────────────────────────────────
  if (isFeed) {
    return (
      <View style={styles.feedCard}>
        {Header}
        <TouchableOpacity activeOpacity={0.95} onPress={openRestaurant} onLongPress={onDelete && post.reviewId ? () => onDelete(post.reviewId!) : undefined} delayLongPress={350}>
          {photos.length > 0 ? (
            <View style={styles.feedMedia}>
              <PhotoCarousel photos={photos} height={250} radius={0} onPressPhoto={openRestaurant} />
              <LinearGradient colors={['transparent', 'rgba(0,0,0,0.78)']} style={styles.feedMediaGradient} pointerEvents="none" />
              <View style={styles.feedOverlay} pointerEvents="none">
                <ScoreBadge rating={post.rating} size={50} />
                <View style={{ flex: 1, marginLeft: spacing[3] }}>
                  <RText variant="h4" color={colors.white} numberOfLines={1}>{r?.name ?? 'Restaurant'}</RText>
                  {meta ? <Caption color={colors.whiteTransparent90} numberOfLines={1}>{meta}</Caption> : null}
                </View>
              </View>
            </View>
          ) : (
            // No-photo: vivid colour band graded to the score, still IG-worthy.
            <LinearGradient
              colors={[scoreColor(post.rating), '#1C1512']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.feedNoPhoto}
            >
              <ScoreBadge rating={post.rating} size={50} />
              <View style={{ flex: 1, marginLeft: spacing[3] }}>
                <RText variant="h4" color={colors.white} numberOfLines={2}>{r?.name ?? 'Restaurant'}</RText>
                {meta ? <Caption color={colors.whiteTransparent90} numberOfLines={1}>{meta}</Caption> : null}
              </View>
            </LinearGradient>
          )}
        </TouchableOpacity>
        {TextBlock}
        {Actions}
        {ListSheet}
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────
  // CARD variant (option 1): clean list card, name + right score badge.
  // ─────────────────────────────────────────────────────────────
  return (
    <View style={styles.card}>
      {Header}
      <TouchableOpacity
        style={styles.restaurantRow}
        onPress={openRestaurant}
        onLongPress={onDelete && post.reviewId ? () => onDelete(post.reviewId!) : undefined}
        delayLongPress={350}
        activeOpacity={0.85}
      >
        <View style={{ flex: 1, marginRight: spacing[3] }}>
          <RText variant="h4" numberOfLines={2}>{r?.name ?? 'Restaurant'}</RText>
          {meta ? <Caption color={colors.textTertiary} style={{ marginTop: 2 }} numberOfLines={1}>{meta}</Caption> : null}
          {!showActor ? <Caption color={colors.textTertiary} style={{ marginTop: 2 }}>{timeAgo}</Caption> : null}
        </View>
        <ScoreBadge rating={post.rating} size={48} />
      </TouchableOpacity>

      {photos.length > 0 && (
        <View style={styles.photos}>
          <PhotoCarousel photos={photos} height={230} radius={radius.lg} onPressPhoto={openRestaurant} />
        </View>
      )}

      {TextBlock}
      {Actions}
      {ListSheet}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    ...(shadows.xs as object),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  // Feed variant is full-bleed (Instagram-style): the photo spans the entire
  // screen width, so there's no boxed card — padding lives on inner sections.
  feedCard: {
    backgroundColor: colors.surface,
    paddingBottom: spacing[1],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },
  headerPad: { paddingHorizontal: spacing[4], paddingTop: spacing[3], marginBottom: spacing[3] },
  userRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  userInfo: { marginLeft: spacing[3], flex: 1 },
  moreBtn: { padding: spacing[1] },
  restaurantRow: { flexDirection: 'row', alignItems: 'flex-start' },
  photos: { marginTop: spacing[3] },
  text: { lineHeight: 22 },
  textPad: { paddingHorizontal: spacing[4] },

  // Feed media
  feedMedia: { position: 'relative' },
  feedMediaGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '55%' },
  feedOverlay: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    bottom: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
  },
  feedNoPhoto: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[5],
    minHeight: 104,
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[3],
    gap: spacing[1],
  },
  actionsPad: { paddingHorizontal: spacing[3], marginTop: spacing[2] },
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
});
