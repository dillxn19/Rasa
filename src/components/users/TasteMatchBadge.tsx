import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import type { TasteMatch } from '@/types';

// ─── Inline match badge (on user profile) ────────────────────

interface TasteMatchBadgeProps {
  score: number;
  compact?: boolean;
}

export function TasteMatchBadge({ score, compact = false }: TasteMatchBadgeProps) {
  const percentage = Math.round(score);

  let color: string;
  let label: string;
  if (percentage >= 80) {
    color = colors.matchHigh;
    label = 'Great match';
  } else if (percentage >= 60) {
    color = colors.matchMedium;
    label = 'Good match';
  } else if (percentage >= 40) {
    color = colors.accent;
    label = 'Some overlap';
  } else {
    color = colors.gray500;
    label = 'Different taste';
  }

  if (compact) {
    return (
      <View style={[styles.compactBadge, { borderColor: color }]}>
        <RText variant="labelMedium" color={color} style={{ fontWeight: '700' }}>
          {percentage}% match
        </RText>
      </View>
    );
  }

  return (
    <View style={styles.badge}>
      <View style={[styles.scoreCircle, { borderColor: color }]}>
        <RText variant="matchScore" color={color}>
          {percentage}
        </RText>
        <RText variant="caption" color={color} style={{ fontWeight: '600' }}>
          %
        </RText>
      </View>
      <View style={{ flex: 1 }}>
        <RText variant="titleSmall" color={color}>{label}</RText>
        <Caption>Taste compatibility</Caption>
      </View>
    </View>
  );
}

// ─── Full taste match card ────────────────────────────────────

interface TasteMatchCardProps {
  match: TasteMatch;
  onPress?: () => void;
  currentUserName?: string;
}

export function TasteMatchCard({ match, onPress, currentUserName }: TasteMatchCardProps) {
  const percentage = match.match_percentage;

  const gradientColors: [string, string] =
    percentage >= 80 ? [colors.success, '#27AE60'] :
    percentage >= 60 ? [colors.warning, '#E67E22'] :
    [colors.gray400, colors.gray500];

  return (
    <TouchableOpacity style={styles.matchCard} onPress={onPress} activeOpacity={0.88}>
      {/* Header with users */}
      <View style={styles.matchHeader}>
        <Avatar
          uri={null}
          name={currentUserName ?? 'You'}
          size="lg"
        />
        <View style={styles.matchConnector}>
          <View style={styles.connectorLine} />
          <LinearGradient
            colors={gradientColors}
            style={styles.percentageCircle}
          >
            <RText variant="labelSmall" color={colors.white} style={{ fontSize: 13, fontWeight: '800' }}>
              {percentage}%
            </RText>
          </LinearGradient>
          <View style={styles.connectorLine} />
        </View>
        <Avatar
          uri={match.user.avatar_url}
          name={match.user.display_name}
          size="lg"
        />
      </View>

      {/* Names */}
      <View style={styles.matchNames}>
        <Caption>{currentUserName ?? 'You'}</Caption>
        <Caption>{match.user.display_name}</Caption>
      </View>

      {/* Common places */}
      {match.common_restaurants.length > 0 && (
        <View style={styles.commonSection}>
          <Caption color={colors.textTertiary}>You both love</Caption>
          <View style={styles.commonList}>
            {match.common_restaurants.slice(0, 3).map(r => (
              <View key={r.id} style={styles.commonItem}>
                <Ionicons name="location" size={12} color={colors.primary} />
                <RText variant="bodySmall" color={colors.textPrimary} style={{ marginLeft: 4 }} numberOfLines={1}>
                  {r.name}
                </RText>
              </View>
            ))}
          </View>
        </View>
      )}

      <View style={styles.matchFooter}>
        <RText variant="bodySmall" color={colors.textSecondary}>
          {match.user.total_reviews} reviews · {match.user.city}
        </RText>
        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
      </View>
    </TouchableOpacity>
  );
}

// ─── Taste match section header ───────────────────────────────

interface TasteMatchSectionProps {
  matches: TasteMatch[];
  onViewAll?: () => void;
  currentUserName?: string;
}

export function TasteMatchSection({ matches, onViewAll, currentUserName }: TasteMatchSectionProps) {
  if (matches.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <RText variant="h4">Taste Matches</RText>
          <Caption>People with similar food taste</Caption>
        </View>
        {onViewAll && (
          <TouchableOpacity onPress={onViewAll}>
            <RText variant="labelMedium" color={colors.primary}>See all</RText>
          </TouchableOpacity>
        )}
      </View>

      {matches.slice(0, 3).map(match => (
        <TasteMatchCard
          key={match.user.id}
          match={match}
          currentUserName={currentUserName}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  // Badge
  compactBadge: {
    borderWidth: 1.5,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    padding: spacing[4],
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },

  // Card
  matchCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[3],
    borderWidth: 1,
    borderColor: colors.border,
  },
  matchHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[3],
    marginBottom: spacing[2],
  },
  matchConnector: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    justifyContent: 'center',
  },
  connectorLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  percentageCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing[2],
  },
  matchNames: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[2],
    marginBottom: spacing[3],
  },
  commonSection: {
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginBottom: spacing[3],
  },
  commonList: {
    gap: spacing[1.5],
    marginTop: spacing[2],
  },
  commonItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  matchFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // Section
  section: {
    paddingHorizontal: spacing[4],
    marginBottom: spacing[6],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing[4],
  },
});
