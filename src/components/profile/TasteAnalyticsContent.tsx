import React from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { ScoreBadge } from '@/components/profile/ReviewCard';
import { useAuthStore } from '@/stores/authStore';
import { getTasteAnalytics } from '@/services/users';
import { CATEGORY_LABELS, CUISINE_LABELS } from '@/types';

/**
 * Taste-analytics sections (overview / rating distribution / top categories /
 * cuisines) with NO outer ScrollView, so it can be embedded inside the Passport
 * page as well as rendered on its own screen. Reads the current user's profile.
 */
export function TasteAnalyticsContent() {
  const { profile } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['tasteAnalytics', profile?.id],
    queryFn: () => getTasteAnalytics(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 60 * 5,
  });

  const maxDist = data ? Math.max(1, ...data.distribution) : 1;
  const cuisines = profile?.favorite_cuisines ?? [];

  if (isLoading || !data) {
    return <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>;
  }

  if (data.total === 0) {
    return (
      <View style={styles.empty}>
        <RText style={{ fontSize: 40, lineHeight: 50 }}>📊</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No taste data yet</RText>
        <Caption color={colors.textSecondary} style={{ marginTop: spacing[2], maxWidth: 260, textAlign: 'center' }}>
          Rate a few restaurants and your palate breakdown will appear here.
        </Caption>
      </View>
    );
  }

  return (
    <View>
      {/* Overview */}
      <View style={styles.overviewRow}>
        <View style={styles.overviewStat}>
          <RText variant="displayMedium">{data.total}</RText>
          <Caption color={colors.textSecondary}>ratings</Caption>
        </View>
        <View style={styles.overviewDivider} />
        <View style={styles.overviewStat}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
            <RText variant="displayMedium">{data.avgRating.toFixed(1)}</RText>
            <ScoreBadge rating={data.avgRating} size={36} />
          </View>
          <Caption color={colors.textSecondary}>average rating</Caption>
        </View>
      </View>

      {/* Rating distribution */}
      <RText variant="h4" style={styles.sectionTitle}>How you rate</RText>
      <View style={styles.card}>
        {[5, 4, 3, 2, 1].map(star => {
          const count = data.distribution[star - 1];
          return (
            <View key={star} style={styles.distRow}>
              <RText variant="labelMedium" color={colors.textSecondary} style={{ width: 28 }}>{star}★</RText>
              <View style={styles.distTrack}>
                <View style={[styles.distFill, { width: `${(count / maxDist) * 100}%` }]} />
              </View>
              <RText variant="labelMedium" color={colors.textSecondary} style={{ width: 28, textAlign: 'right' }}>
                {count}
              </RText>
            </View>
          );
        })}
      </View>

      {/* Top categories */}
      <RText variant="h4" style={styles.sectionTitle}>Where you eat most</RText>
      <View style={styles.card}>
        {data.topCategories.map((c, i) => (
          <View key={c.key} style={[styles.catRow, i > 0 && styles.catRowBorder]}>
            <RText variant="titleSmall" style={{ flex: 1 }}>
              {CATEGORY_LABELS[c.key as keyof typeof CATEGORY_LABELS] ?? c.key}
            </RText>
            <Caption color={colors.textTertiary} style={{ marginRight: spacing[3] }}>
              {c.count} {c.count === 1 ? 'visit' : 'visits'}
            </Caption>
            <View style={styles.catScore}>
              <RText style={{ fontSize: 11, lineHeight: 15 }}>⭐</RText>
              <RText variant="labelMedium" color={colors.textPrimary} style={{ marginLeft: 2 }}>
                {c.avg.toFixed(1)}
              </RText>
            </View>
          </View>
        ))}
      </View>

      {/* Favourite cuisines */}
      {cuisines.length > 0 && (
        <>
          <RText variant="h4" style={styles.sectionTitle}>Your cuisines</RText>
          <View style={styles.chipWrap}>
            {cuisines.map(c => (
              <View key={c} style={styles.chip}>
                <RText variant="labelMedium" color={colors.primary} style={{ fontWeight: '700' }}>
                  {CUISINE_LABELS[c] ?? c}
                </RText>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[10] },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing[10], paddingHorizontal: spacing[6] },
  overviewRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[5],
    marginBottom: spacing[2],
  },
  overviewStat: { flex: 1, alignItems: 'center', gap: spacing[1] },
  overviewDivider: { width: 1, backgroundColor: colors.border },
  sectionTitle: { marginTop: spacing[5], marginBottom: spacing[3] },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: spacing[1] + 2 },
  distTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.gray100, overflow: 'hidden' },
  distFill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  catRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: spacing[3] },
  catRowBorder: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border },
  catScore: { flexDirection: 'row', alignItems: 'center' },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2] },
  chip: {
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
});
