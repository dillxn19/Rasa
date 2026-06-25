import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import type { RestaurantDishEntry } from '@/types';
import { PRICE_LABELS } from '@/types';

interface DishRankingRowProps {
  entry: RestaurantDishEntry;
  rank: number;
  showSignature?: boolean;
}

export function DishRankingRow({ entry, rank, showSignature = true }: DishRankingRowProps) {
  const restaurant = entry.restaurant;
  if (!restaurant) return null;

  const handlePress = () => router.push(`/restaurant/${restaurant.id}`);

  const isMedal = rank <= 3;
  const medals = ['🥇', '🥈', '🥉'];

  return (
    <TouchableOpacity style={styles.row} onPress={handlePress} activeOpacity={0.85}>
      {/* Rank */}
      <View style={styles.rankContainer}>
        {isMedal ? (
          <RText style={styles.medal}>{medals[rank - 1]}</RText>
        ) : (
          <RText style={styles.rankNum}>{rank}</RText>
        )}
      </View>

      {/* Restaurant photo */}
      <View style={styles.photoWrap}>
        {restaurant.cover_photo_url ? (
          <Image
            source={{ uri: restaurant.cover_photo_url }}
            style={styles.photo}
            contentFit="cover"
            transition={200}
          />
        ) : (
          <View style={[styles.photo, styles.photoFallback]}>
            <RText style={{ fontSize: 20 }}>🍴</RText>
          </View>
        )}
        {showSignature && entry.is_signature && (
          <View style={styles.signatureBadge}>
            <RText style={{ fontSize: 9, fontWeight: '700', color: colors.white }}>SIG</RText>
          </View>
        )}
      </View>

      {/* Info */}
      <View style={styles.info}>
        <View style={styles.nameRow}>
          <RText variant="titleSmall" numberOfLines={1} style={{ flex: 1 }}>
            {restaurant.name}
          </RText>
          {entry.price != null && (
            <Caption color={colors.textTertiary}>
              RM{entry.price.toFixed(0)}
            </Caption>
          )}
        </View>

        <Caption numberOfLines={1} color={colors.textSecondary}>
          {restaurant.area ?? restaurant.city} · {restaurant.city}
        </Caption>

        <View style={styles.metaRow}>
          <StarRating value={entry.average_rating} size={11} readonly compact />
          <Caption color={colors.textTertiary} style={{ marginLeft: spacing[2] }}>
            {entry.rating_count} ratings
          </Caption>
          {entry.local_name && entry.local_name !== '' && (
            <Caption color={colors.textTertiary} style={{ marginLeft: spacing[2] }}>
              · {entry.local_name}
            </Caption>
          )}
        </View>
      </View>

      <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

interface DishRankingListProps {
  entries: RestaurantDishEntry[];
  emptyMessage?: string;
}

export function DishRankingList({ entries, emptyMessage = 'No restaurants yet' }: DishRankingListProps) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <RText style={{ fontSize: 32 }}>🍴</RText>
        <Caption style={{ marginTop: spacing[2] }}>{emptyMessage}</Caption>
      </View>
    );
  }

  return (
    <View style={styles.list}>
      {entries.map((entry, idx) => (
        <DishRankingRow key={entry.id} entry={entry} rank={idx + 1} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
    backgroundColor: colors.background,
  },
  rankContainer: {
    width: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medal: {
    fontSize: 20,
  },
  rankNum: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textTertiary,
  },
  photoWrap: {
    position: 'relative',
  },
  photo: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
  },
  photoFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  signatureBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderWidth: 1.5,
    borderColor: colors.background,
  },
  info: {
    flex: 1,
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  list: {
    backgroundColor: colors.background,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing[10],
  },
});
