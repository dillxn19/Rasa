import React from 'react';
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
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import { AvatarStack } from '@/components/ui/Avatar';
import type { Restaurant, Review } from '@/types';
import { CATEGORY_LABELS, DIETARY_LABELS, PRICE_LABELS } from '@/types';
import { getOpenStatus } from '@/lib/openingHours';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Standard card (for grids, lists) ────────────────────────

interface RestaurantCardProps {
  restaurant: Restaurant;
  onPress?: () => void;
  showFriendRating?: boolean;
  friendReviews?: Review[];
  style?: object;
}

export function RestaurantCard({
  restaurant,
  onPress,
  showFriendRating = false,
  friendReviews = [],
  style,
}: RestaurantCardProps) {
  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/restaurant/${restaurant.slug ?? restaurant.id}`);
  };

  const openStatus = getOpenStatus(restaurant.opening_hours);
  const isHalal = restaurant.dietary_options.includes('halal_certified');
  const isMuslimFriendly = !isHalal && restaurant.dietary_options.includes('muslim_friendly');

  return (
    <TouchableOpacity style={[styles.card, style]} onPress={handlePress} activeOpacity={0.92}>
      {/* Photo */}
      <View style={styles.photoContainer}>
        {restaurant.cover_photo_url ? (
          <Image source={{ uri: restaurant.cover_photo_url }} style={styles.photo} contentFit="cover" transition={250} />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <Ionicons name="restaurant-outline" size={36} color={colors.gray300} />
          </View>
        )}

        {/* Save */}
        <TouchableOpacity style={styles.saveBtn}>
          <Ionicons
            name={restaurant.is_saved ? 'bookmark' : 'bookmark-outline'}
            size={20}
            color={restaurant.is_saved ? colors.bookmarked : colors.white}
          />
        </TouchableOpacity>

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
          <RText variant="titleLarge" numberOfLines={1} style={{ flex: 1 }}>{restaurant.name}</RText>
          <View style={styles.ratingPill}>
            <RText style={{ fontSize: 12 }}>⭐</RText>
            <RText variant="titleSmall" style={{ marginLeft: 3 }}>
              {restaurant.overall_rating.toFixed(1)}
            </RText>
          </View>
        </View>

        <View style={styles.metaRow}>
          <RText variant="bodySmall" color={colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
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
    </TouchableOpacity>
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
      {restaurant.cover_photo_url ? (
        <Image
          source={{ uri: restaurant.cover_photo_url }}
          style={styles.heroPhoto}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[styles.heroPhoto, styles.photoFallback]}>
          <Ionicons name="restaurant-outline" size={48} color={colors.gray300} />
        </View>
      )}

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
          <StarRating value={restaurant.overall_rating} size={14} readonly compact color={colors.starFilled} />
          <RText variant="bodySmall" color={colors.whiteTransparent80} style={{ marginLeft: spacing[3] }}>
            {restaurant.total_reviews} reviews
          </RText>
          <View style={styles.dot} />
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
      {restaurant.cover_photo_url ? (
        <Image
          source={{ uri: restaurant.cover_photo_url }}
          style={styles.chipPhoto}
          contentFit="cover"
          transition={200}
        />
      ) : (
        <View style={[styles.chipPhoto, styles.photoFallback]} />
      )}
      <View style={styles.chipContent}>
        <RText variant="titleSmall" numberOfLines={1}>{restaurant.name}</RText>
        <StarRating value={restaurant.overall_rating} size={11} readonly compact />
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
  saveBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    backgroundColor: colors.blackTransparent40,
    borderRadius: radius.full,
    padding: 8,
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
