import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption, Body } from '@/components/ui/Text';
import { CATEGORY_LABELS } from '@/types';
import type { Review } from '@/types';

// ─── Beli-style score badge (shared across all profile surfaces) ──

/** Colour-graded like Beli: green (great) → amber → orange → red (poor). */
export function scoreColor(rating: number): string {
  if (rating >= 4) return '#3E8E5A';
  if (rating >= 3) return colors.accentDark;
  if (rating >= 2) return '#E07B39';
  return colors.primary;
}

export function ScoreBadge({ rating, size = 46 }: { rating: number; size?: number }) {
  return (
    <View style={[styles.scoreBadge, { width: size, height: size, backgroundColor: scoreColor(rating) }]}>
      <RText style={[styles.scoreBadgeNum, { fontSize: size * 0.4, lineHeight: size * 0.44 }]}>
        {rating % 1 === 0 ? rating.toFixed(0) : rating.toFixed(1)}
      </RText>
      <Ionicons name="star" size={size * 0.18} color={colors.whiteTransparent90} style={{ marginTop: -1 }} />
    </View>
  );
}

// ─── Review photos (the user's own posted photos) ─────────────

function ReviewPhotos({ photos }: { photos: string[] }) {
  if (photos.length === 1) {
    return <Image source={{ uri: photos[0] }} style={styles.photoSingle} contentFit="cover" transition={200} />;
  }
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoScroll}>
      {photos.map((p, i) => (
        <Image key={i} source={{ uri: p }} style={styles.photoMulti} contentFit="cover" transition={200} />
      ))}
    </ScrollView>
  );
}

// ─── Review card ──────────────────────────────────────────────

/**
 * Beli-style review card: big restaurant name + colour score badge, the user's
 * OWN posted photos underneath (never the restaurant's stock cover, so the list
 * stays clean and standardized), then the review text and date.
 */
export function ReviewCard({ review }: { review: Review }) {
  const photos = (review.photos ?? []) as string[];
  const r = review.restaurant as any;
  const meta = [
    r?.category ? (CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] ?? r.category) : null,
    r?.area ?? r?.city,
  ].filter(Boolean).join(' · ');

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => review.restaurant && router.push(`/restaurant/${review.restaurant.id}`)}
      activeOpacity={0.9}
    >
      <View style={styles.header}>
        <View style={{ flex: 1, marginRight: spacing[3] }}>
          <RText variant="h4" numberOfLines={2}>{r?.name ?? 'Restaurant'}</RText>
          {meta ? (
            <Caption color={colors.textTertiary} style={{ marginTop: 2 }} numberOfLines={1}>{meta}</Caption>
          ) : null}
        </View>
        <ScoreBadge rating={review.rating} />
      </View>

      {photos.length > 0 && (
        <View style={styles.photos}>
          <ReviewPhotos photos={photos} />
        </View>
      )}

      {review.content ? (
        <Body color={colors.textPrimary} style={styles.text}>{review.content}</Body>
      ) : null}

      <Caption color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
        {new Date(review.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
      </Caption>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  scoreBadge: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  scoreBadgeNum: { color: colors.white, fontWeight: '800' },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    ...(shadows.xs as object),
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
  },
  header: { flexDirection: 'row', alignItems: 'flex-start' },
  photos: { marginTop: spacing[3] },
  photoSingle: { width: '100%', height: 220, borderRadius: radius.lg, backgroundColor: colors.gray100 },
  photoScroll: { gap: spacing[2], paddingRight: spacing[1] },
  photoMulti: { width: 260, height: 200, borderRadius: radius.lg, backgroundColor: colors.gray100 },
  text: { marginTop: spacing[3], lineHeight: 22 },
});
