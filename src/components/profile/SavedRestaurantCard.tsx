import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { CoverImage } from '@/components/restaurants/CoverImage';
import { CATEGORY_LABELS } from '@/types';
import type { Restaurant } from '@/types';

export function SavedRestaurantCard({
  restaurant, distance, showWantChip = true,
}: {
  restaurant: Restaurant;
  distance?: string | null;
  showWantChip?: boolean;
}) {
  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/restaurant/${restaurant.slug ?? restaurant.id}`)}
      activeOpacity={0.9}
    >
      <CoverImage
        uri={restaurant.cover_photo_url}
        category={restaurant.category}
        emojiSize={26}
        style={styles.thumb}
      />

      <View style={styles.info}>
        <RText variant="titleLarge" numberOfLines={1}>{restaurant.name}</RText>
        <Caption color={colors.textTertiary} numberOfLines={1} style={{ marginTop: 2 }}>
          {CATEGORY_LABELS[restaurant.category as keyof typeof CATEGORY_LABELS] ?? restaurant.category}
          {restaurant.area ?? restaurant.city ? ` · ${restaurant.area ?? restaurant.city}` : ''}
        </Caption>
        <View style={styles.metaRow}>
          {distance ? (
            <View style={styles.metaPill}>
              <Ionicons name="navigate" size={11} color={colors.primary} />
              <RText variant="labelSmall" color={colors.primary} style={{ marginLeft: 3 }}>{distance}</RText>
            </View>
          ) : null}
          {showWantChip ? (
            <View style={styles.wantChip}>
              <Ionicons name="bookmark" size={10} color={colors.bookmarked} />
              <RText variant="labelSmall" color={colors.textSecondary} style={{ marginLeft: 3 }}>Want to try</RText>
            </View>
          ) : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[2] + 2,
    ...(shadows.xs as object),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  thumb: { width: 76, height: 76, borderRadius: radius.lg, backgroundColor: colors.gray100 },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, marginLeft: spacing[3], marginRight: spacing[2] },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[2] },
  metaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray50,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  wantChip: { flexDirection: 'row', alignItems: 'center' },
});
