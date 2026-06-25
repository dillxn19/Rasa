import React from 'react';
import {
  View, TouchableOpacity, StyleSheet, Dimensions, ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import type { Dish } from '@/types';
import { MEAL_TIME_LABELS } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ─── Ranked dish card (for "Best Nasi Lemak" lists) ──────────

interface DishRankCardProps {
  dish: Dish;
  rank: number;
  restaurantName?: string;
  restaurantCity?: string;
  onPress?: () => void;
}

export function DishRankCard({ dish, rank, restaurantName, restaurantCity, onPress }: DishRankCardProps) {
  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/dish/${dish.slug}`);
  };

  return (
    <TouchableOpacity style={styles.rankCard} onPress={handlePress} activeOpacity={0.88}>
      {/* Rank number */}
      <View style={styles.rankBadge}>
        <RText style={styles.rankNumber}>{rank}</RText>
      </View>

      {/* Dish photo */}
      <View style={styles.rankPhotoContainer}>
        {dish.cover_photo_url ? (
          <Image source={{ uri: dish.cover_photo_url }} style={styles.rankPhoto} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.rankPhoto, styles.photoFallback]}>
            <RText style={{ fontSize: 32 }}>🍴</RText>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.rankInfo}>
        <RText variant="titleMedium" numberOfLines={1}>{dish.name}</RText>
        {restaurantName && (
          <View style={styles.restaurantRow}>
            <Ionicons name="location-outline" size={12} color={colors.textTertiary} />
            <Caption style={{ marginLeft: 3 }} numberOfLines={1}>
              {restaurantName}{restaurantCity ? ` · ${restaurantCity}` : ''}
            </Caption>
          </View>
        )}
        <StarRating value={dish.average_rating} size={12} readonly compact />
      </View>

      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ─── Dish hero card (for dish profile page header) ───────────

interface DishHeroCardProps {
  dish: Dish;
  onPress?: () => void;
}

export function DishHeroCard({ dish, onPress }: DishHeroCardProps) {
  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/dish/${dish.slug}`);
  };

  return (
    <TouchableOpacity style={styles.heroCard} onPress={handlePress} activeOpacity={0.9}>
      {dish.cover_photo_url ? (
        <Image source={{ uri: dish.cover_photo_url }} style={styles.heroPhoto} contentFit="cover" transition={300} />
      ) : (
        <View style={[styles.heroPhoto, styles.heroFallback]}>
          <RText style={{ fontSize: 56 }}>🍜</RText>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.heroGradient}
      />

      <View style={styles.heroContent}>
        <View style={styles.heroMeta}>
          {dish.best_meal_times.slice(0, 2).map(mt => (
            <View key={mt} style={styles.mealTimePill}>
              <RText style={{ fontSize: 10, color: colors.white, fontWeight: '600' }}>
                {MEAL_TIME_LABELS[mt as keyof typeof MEAL_TIME_LABELS] ?? mt}
              </RText>
            </View>
          ))}
          {dish.is_halal_by_default && (
            <View style={[styles.mealTimePill, { backgroundColor: colors.halal }]}>
              <RText style={{ fontSize: 10, color: colors.white, fontWeight: '700' }}>HALAL</RText>
            </View>
          )}
        </View>
        <RText variant="h3" color={colors.white}>{dish.name}</RText>
        {dish.name_bm && dish.name_bm !== dish.name && (
          <Caption color="rgba(255,255,255,0.7)">{dish.name_bm}</Caption>
        )}
        <View style={styles.heroStats}>
          <StarRating value={dish.average_rating} size={14} readonly compact color={colors.accent} />
          <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: spacing[3] }}>
            {dish.total_ratings.toLocaleString()} ratings
          </Caption>
          <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: spacing[2] }}>
            · {dish.total_restaurant_count} restaurants
          </Caption>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Compact dish chip (horizontal scroll rows) ───────────────

export function DishChip({ dish, onPress }: { dish: Dish; onPress?: () => void }) {
  return (
    <TouchableOpacity
      style={styles.chip}
      onPress={onPress ?? (() => router.push(`/dish/${dish.slug}`))}
      activeOpacity={0.85}
    >
      {dish.cover_photo_url ? (
        <Image source={{ uri: dish.cover_photo_url }} style={styles.chipPhoto} contentFit="cover" />
      ) : (
        <View style={[styles.chipPhoto, styles.chipFallback]}>
          <RText style={{ fontSize: 24 }}>🍴</RText>
        </View>
      )}
      <View style={styles.chipContent}>
        <RText variant="titleSmall" numberOfLines={1}>{dish.name}</RText>
        <StarRating value={dish.average_rating} size={11} readonly compact />
      </View>
    </TouchableOpacity>
  );
}

// ─── Dish discovery section (for explore + home feed) ────────

interface DishDiscoverySectionProps {
  title: string;
  subtitle?: string;
  dishes: Dish[];
  onViewAll?: () => void;
}

export function DishDiscoverySection({ title, subtitle, dishes, onViewAll }: DishDiscoverySectionProps) {
  if (dishes.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <RText variant="h4">{title}</RText>
          {subtitle && <Caption>{subtitle}</Caption>}
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <Caption color={colors.primary}>See all</Caption>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
      >
        {dishes.map(dish => (
          <DishChip key={dish.id} dish={dish} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  // Rank card
  rankCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankNumber: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.primary,
  },
  rankPhotoContainer: {
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  rankPhoto: {
    width: 64,
    height: 64,
    borderRadius: radius.xl,
  },
  photoFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankInfo: {
    flex: 1,
    gap: spacing[1],
  },
  restaurantRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Hero card
  heroCard: {
    height: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    ...(shadows.lg as object),
  },
  heroPhoto: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  heroFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    gap: spacing[2],
  },
  heroMeta: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  mealTimePill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  heroStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Chip
  chip: {
    width: 140,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...(shadows.sm as object),
  },
  chipPhoto: {
    width: '100%',
    height: 90,
  },
  chipFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipContent: {
    padding: spacing[3],
    gap: spacing[1],
  },

  // Section
  section: {
    paddingBottom: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
  },
  chipRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
});
