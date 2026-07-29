import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius } from '@/theme';
import { RText } from '@/components/ui/Text';

// ─── Beli-style score badge (shared across all review surfaces) ──
// The review card itself now lives in `@/components/reviews/ReviewPostCard`,
// which both the feed and the profile Activity tab use. These two primitives
// stay here because several screens import them directly.

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

const styles = StyleSheet.create({
  scoreBadge: { borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center' },
  scoreBadgeNum: { color: colors.white, fontWeight: '800' },
});
