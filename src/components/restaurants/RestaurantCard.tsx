import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Pressable,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import { AvatarStack } from '@/components/ui/Avatar';
import type { Restaurant, Review } from '@/types';
import { CATEGORY_LABELS, DIETARY_LABELS, PRICE_LABELS } from '@/types';
import { getOpenStatus } from '@/lib/openingHours';
import { CoverImage } from './CoverImage';
import { useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/stores/authStore';
import { saveRestaurant, unsaveRestaurant } from '@/services/restaurants';
import { useReviewedRestaurantIds } from '@/hooks/useReviewedRestaurants';
import { useSavedRestaurantIds } from '@/hooks/useSavedRestaurants';
import { toast } from '@/stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Subtle press-in scale used across cards for a tactile, "cool" feel.
function usePressScale(target = 0.97) {
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  const onPressIn = () => { scale.value = withSpring(target, { damping: 18, stiffness: 320 }); };
  const onPressOut = () => { scale.value = withSpring(1, { damping: 16, stiffness: 300 }); };
  return { style, onPressIn, onPressOut };
}

// ─── Standard card (for grids, lists) ────────────────────────

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
  showFriendRating?: boolean;
  friendReviews?: Review[];
  distance?: string | null;
  hideActions?: boolean;
  style?: object;
}

export function RestaurantCard({
  restaurant,
  onPress,
  showFriendRating = false,
  friendReviews = [],
  distance,
  hideActions = false,
  style,
}: RestaurantCardProps) {
  const press = usePressScale();
  const qc = useQueryClient();
  const profileId = useAuthStore(s => s.profile?.id);
  const reviewedIds = useReviewedRestaurantIds();
  const savedIds = useSavedRestaurantIds();
  const hasVisited = reviewedIds.has(restaurant.id);
  // Reflect the real saved state (from the shared saved-ids set) with an optional
  // local override for the optimistic toggle on this card.
  const [savedOverride, setSavedOverride] = useState<boolean | null>(null);
  const isSaved = savedOverride ?? (restaurant.is_saved ?? savedIds.has(restaurant.id));
  const [saving, setSaving] = useState(false);

  const handlePress = () => {
    Haptics.selectionAsync().catch(() => {});
    if (onPress) onPress();
    else router.push(`/restaurant/${restaurant.slug ?? restaurant.id}`);
  };

  // Quick-rate: jump into the review flow with this place preselected.
  const handleRate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    router.push({
      pathname: '/(tabs)/add',
      params: {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        restaurantCategory: restaurant.category,
        restaurantCity: restaurant.city ?? '',
      },
    } as any);
  };

  // Toggle bookmark directly from the card (no need to open the restaurant).
  const handleSave = async () => {
    if (!profileId || saving) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const next = !isSaved;
    setSavedOverride(next);
    setSaving(true);
    try {
      if (next) await saveRestaurant(profileId, restaurant.id);
      else await unsaveRestaurant(profileId, restaurant.id);
      // Refresh the shared saved-ids set + the profile's Saved tab (key ['saved', uid]).
      qc.invalidateQueries({ queryKey: ['userSavedIds', profileId] });
      qc.invalidateQueries({ queryKey: ['saved', profileId] });
    } catch {
      setSavedOverride(!next); // revert on failure
      toast.error('Could not update your saves. Try again.');
    } finally {
      setSaving(false);
    }
  };

  const openStatus = getOpenStatus(restaurant.opening_hours);
  const dietary = restaurant.dietary_options ?? [];
  const isHalal = dietary.includes('halal_certified');
  const isMuslimFriendly = !isHalal && dietary.includes('muslim_friendly');

  return (
    <AnimatedPressable
      style={[styles.card, style, press.style]}
      onPress={handlePress}
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
    >
      {/* Photo */}
      <View style={styles.photoContainer}>
        <CoverImage uri={restaurant.cover_photo_url} category={restaurant.category} emojiSize={38} fill />

        {/* Top-right actions: bookmark + rate (or a been-there checkmark).
            Hidden in contexts that own the corner (e.g. list management). */}
        {!hideActions && (
        <View style={styles.cardActions}>
          {hasVisited ? (
            <View style={[styles.iconBtn, styles.visitedBtn]}>
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            </View>
          ) : (
            <>
              <TouchableOpacity
                style={[styles.iconBtn, isSaved && styles.saveBtnActive]}
                onPress={handleSave}
                hitSlop={6}
                activeOpacity={0.8}
              >
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={18}
                  color={isSaved ? colors.bookmarked : colors.white}
                />
              </TouchableOpacity>
              <TouchableOpacity style={[styles.iconBtn, styles.rateBtn]} onPress={handleRate} hitSlop={6} activeOpacity={0.85}>
                <Ionicons name="add" size={20} color={colors.white} />
              </TouchableOpacity>
            </>
          )}
        </View>
        )}

        {/* Halal badge */}
        {(isHalal || isMuslimFriendly) && (
          <View style={styles.halalBadge}>
            <RText variant="caption" color={colors.halal} style={{ fontWeight: '800' }}>
              {isHalal ? 'HALAL' : 'MUSLIM OK'}
            </RText>
          </View>
        )}
      </View>

      {/* Content */}
      <View style={styles.content}>
        <View style={styles.nameRow}>
          {/* No aggregate rating on cards — ratings live on the restaurant page
              only (avoids surfacing borrowed/unrated numbers). */}
          <RText variant="titleLarge" numberOfLines={1} style={{ flex: 1 }}>{restaurant.name}</RText>
        </View>

        <View style={styles.metaRow}>
          <RText variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
            {distance ? <RText variant="bodySmall" color={colors.primary} style={{ fontWeight: '700' }}>{distance} · </RText> : null}
            {CATEGORY_LABELS[restaurant.category]} · {restaurant.area ?? restaurant.city} · {restaurant.price_range}
          </RText>
          {openStatus.isOpen !== null && (
            <View style={[styles.openBadge, { borderColor: openStatus.color }]}>
              <RText style={{ fontSize: 10, fontWeight: '700', color: openStatus.color }}>
                {openStatus.label}
              </RText>
            </View>
          )}
        </View>

        {/* Friend activity */}
        {showFriendRating && friendReviews.length > 0 && (
          <View style={styles.friendRow}>
            <AvatarStack
              users={friendReviews.map(r => r.user!).filter(Boolean)}
              size="xs"
              max={3}
            />
            <Caption style={{ marginLeft: spacing[2] }}>
              {friendReviews.length === 1
                ? `${friendReviews[0]!.user?.display_name?.split(' ')[0]} rated ${friendReviews[0]!.rating}★`
                : `${friendReviews.length} friends visited`}
            </Caption>
          </View>
        )}
      </View>
    </AnimatedPressable>
  );
}

// ─── Large hero card (for "For You" recommendations) ─────────

export function RestaurantHeroCard({
  restaurant,
  recommendationLabel,
  onPress,
}: {
  restaurant: Restaurant;
  recommendationLabel?: string;
  onPress?: () => void;
}) {
  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/restaurant/${restaurant.slug ?? restaurant.id}`);
  };

  return (
    <TouchableOpacity
      style={styles.heroCard}
      onPress={handlePress}
      activeOpacity={0.93}
    >
      <CoverImage uri={restaurant.cover_photo_url} category={restaurant.category} emojiSize={52} fill transition={300} />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.heroGradient}
      />

      {recommendationLabel && (
        <View style={styles.recommendationBadge}>
          <Ionicons name="sparkles" size={12} color={colors.accent} />
          <RText variant="caption" color={colors.accent} style={{ marginLeft: 4, fontWeight: '600' }}>
            {recommendationLabel}
          </RText>
        </View>
      )}

      <View style={styles.heroContent}>
        <RText variant="h3" color={colors.white} numberOfLines={1}>
          {restaurant.name}
        </RText>
        <View style={styles.heroMeta}>
          <RText variant="bodySmall" color={colors.whiteTransparent80}>
            {restaurant.area ?? restaurant.city}
          </RText>
        </View>

        <View style={styles.heroBadges}>
          <View style={styles.categoryBadge}>
            <RText variant="caption" color={colors.white}>
              {CATEGORY_LABELS[restaurant.category]}
            </RText>
          </View>
          <RText variant="bodySmall" color={colors.whiteTransparent80}>
            {restaurant.price_range}
          </RText>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Horizontal scroll card ───────────────────────────────────

export function RestaurantChip({
  restaurant,
  onPress,
}: {
  restaurant: Restaurant;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress ?? (() => router.push(`/restaurant/${restaurant.slug ?? restaurant.id}`))}
      activeOpacity={0.88}
    >
      <CoverImage uri={restaurant.cover_photo_url} category={restaurant.category} emojiSize={30} style={styles.chipPhoto} transition={200} />
      <View style={styles.chipContent}>
        <RText variant="titleSmall" numberOfLines={1}>{restaurant.name}</RText>
        <Caption color={colors.textTertiary} numberOfLines={1}>
          {restaurant.area ?? restaurant.city}
        </Caption>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Standard card
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    ...(shadows.card as object),
    marginBottom: spacing[3],
  },
  photoContainer: {
    height: 200,
    position: 'relative',
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardActions: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    flexDirection: 'row',
    gap: spacing[2],
  },
  iconBtn: {
    backgroundColor: colors.blackTransparent40,
    borderRadius: radius.full,
    padding: 8,
  },
  saveBtnActive: {
    backgroundColor: colors.white,
  },
  rateBtn: {
    backgroundColor: colors.primary,
  },
  visitedBtn: {
    backgroundColor: colors.white,
    padding: 6,
  },
  halalBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    backgroundColor: colors.halalBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.halal,
  },
  content: {
    padding: spacing[4],
    gap: spacing[1],
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing[2],
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSurface,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  newPill: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: spacing[2],
  },
  openBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    flexShrink: 0,
  },
  friendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[2],
    paddingTop: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },

  // Hero card
  heroCard: {
    width: SCREEN_WIDTH - spacing[8],
    height: 280,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    ...(shadows.lg as object),
  },
  heroPhoto: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '70%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[5],
    gap: spacing[2],
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  heroBadges: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
  },
  categoryBadge: {
    backgroundColor: colors.whiteTransparent80,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  recommendationBadge: {
    position: 'absolute',
    top: spacing[4],
    left: spacing[4],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.whiteTransparent80,
    marginHorizontal: spacing[2],
  },

  // Chip card
  chip: {
    width: 160,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...(shadows.sm as object),
  },
  chipPhoto: {
    width: '100%',
    height: 110,
  },
  chipContent: {
    padding: spacing[3],
    gap: spacing[1],
  },
});
