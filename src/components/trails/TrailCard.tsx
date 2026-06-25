import React from 'react';
import { View, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import type { FoodTrail } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIFFICULTY_CONFIG = {
  easy:     { label: 'Easy',     color: colors.success,  icon: '🚶' as const },
  moderate: { label: 'Moderate', color: colors.accent,   icon: '🚴' as const },
  hardcore: { label: 'Hardcore', color: colors.primary,  icon: '🔥' as const },
};

// ─── Compact progress bar ─────────────────────────────────────

function TrailProgress({ completed, total }: { completed: number; total: number }) {
  const pct = total === 0 ? 0 : (completed / total) * 100;
  return (
    <View style={styles.progressWrap}>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${pct}%` }]} />
      </View>
      <Caption color={colors.white} style={{ marginLeft: spacing[2], fontWeight: '700' }}>
        {completed}/{total}
      </Caption>
    </View>
  );
}

// ─── Full-width hero card ─────────────────────────────────────

interface TrailHeroCardProps {
  trail: FoodTrail;
  onPress?: () => void;
}

export function TrailHeroCard({ trail, onPress }: TrailHeroCardProps) {
  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/trail/${trail.id}`);
  };

  const difficulty = DIFFICULTY_CONFIG[trail.difficulty];
  const completed = trail.user_progress?.completed_stops.length ?? 0;
  const inProgress = completed > 0 && !trail.user_progress?.is_completed;
  const isDone = trail.user_progress?.is_completed ?? false;

  return (
    <TouchableOpacity style={styles.hero} onPress={handlePress} activeOpacity={0.9}>
      {trail.cover_photo_url ? (
        <Image source={{ uri: trail.cover_photo_url }} style={styles.heroPhoto} contentFit="cover" transition={300} />
      ) : (
        <View style={[styles.heroPhoto, styles.heroFallback]}>
          <RText style={{ fontSize: 56 }}>🗺️</RText>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.9)']}
        style={styles.heroGradient}
      />

      {/* Completion overlay */}
      {isDone && (
        <View style={styles.completedOverlay}>
          <RText style={{ fontSize: 32 }}>🎉</RText>
          <RText variant="titleMedium" color={colors.white}>Completed!</RText>
        </View>
      )}

      <View style={styles.heroContent}>
        {/* Badges row */}
        <View style={styles.badgeRow}>
          <View style={[styles.diffBadge, { backgroundColor: difficulty.color + 'CC' }]}>
            <RText style={{ fontSize: 12 }}>{difficulty.icon}</RText>
            <RText style={{ fontSize: 11, color: colors.white, fontWeight: '700', marginLeft: 3 }}>
              {difficulty.label}
            </RText>
          </View>
          {trail.is_featured && (
            <View style={styles.featuredBadge}>
              <RText style={{ fontSize: 10, color: colors.accent, fontWeight: '700' }}>⭐ FEATURED</RText>
            </View>
          )}
          {isDone && (
            <View style={[styles.featuredBadge, { backgroundColor: colors.success + 'CC' }]}>
              <RText style={{ fontSize: 10, color: colors.white, fontWeight: '700' }}>✓ DONE</RText>
            </View>
          )}
        </View>

        <RText variant="h3" color={colors.white} numberOfLines={2}>{trail.title}</RText>
        {trail.title_bm && (
          <Caption color="rgba(255,255,255,0.65)">{trail.title_bm}</Caption>
        )}

        <View style={styles.metaRow}>
          <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }}>{trail.city}</Caption>
          <Caption color="rgba(255,255,255,0.5)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
          <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }}>
            {trail.estimated_duration_hours ? `${trail.estimated_duration_hours}h` : '?'}
          </Caption>
          <Caption color="rgba(255,255,255,0.5)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
          <Ionicons name="map-outline" size={13} color="rgba(255,255,255,0.7)" />
          <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }}>
            {trail.total_stops} stops
          </Caption>
        </View>

        {inProgress && (
          <TrailProgress completed={completed} total={trail.total_stops} />
        )}

        <View style={styles.statsRow}>
          <Caption color="rgba(255,255,255,0.6)">
            {trail.follower_count.toLocaleString()} following
          </Caption>
          <Caption color="rgba(255,255,255,0.4)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
          <Caption color="rgba(255,255,255,0.6)">
            {trail.completion_count.toLocaleString()} completed
          </Caption>
          {trail.estimated_cost_myr && (
            <>
              <Caption color="rgba(255,255,255,0.4)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
              <Caption color="rgba(255,255,255,0.6)">~RM{trail.estimated_cost_myr}</Caption>
            </>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Compact card (horizontal scroll) ────────────────────────

export function TrailCard({ trail, onPress }: TrailHeroCardProps) {
  const handlePress = () => {
    if (onPress) onPress();
    else router.push(`/trail/${trail.id}`);
  };

  const difficulty = DIFFICULTY_CONFIG[trail.difficulty];
  const completed = trail.user_progress?.completed_stops.length ?? 0;
  const hasProgress = completed > 0;

  return (
    <TouchableOpacity style={styles.card} onPress={handlePress} activeOpacity={0.88}>
      <View style={styles.cardPhotoWrap}>
        {trail.cover_photo_url ? (
          <Image source={{ uri: trail.cover_photo_url }} style={styles.cardPhoto} contentFit="cover" transition={200} />
        ) : (
          <View style={[styles.cardPhoto, styles.cardFallback]}>
            <RText style={{ fontSize: 36 }}>🗺️</RText>
          </View>
        )}
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.cardGradient}
        />
        <View style={[styles.diffBadge, styles.cardDiffBadge, { backgroundColor: difficulty.color + 'CC' }]}>
          <RText style={{ fontSize: 10 }}>{difficulty.icon}</RText>
          <RText style={{ fontSize: 10, color: colors.white, fontWeight: '700', marginLeft: 2 }}>
            {difficulty.label}
          </RText>
        </View>
        {trail.user_progress?.is_completed && (
          <View style={styles.cardCompletedBadge}>
            <RText style={{ fontSize: 14 }}>✓</RText>
          </View>
        )}
      </View>

      <View style={styles.cardBody}>
        <RText variant="titleSmall" numberOfLines={2}>{trail.title}</RText>
        <View style={styles.cardMeta}>
          <Caption color={colors.textTertiary}>{trail.city}</Caption>
          <Caption color={colors.textTertiary} style={{ marginHorizontal: 4 }}>·</Caption>
          <Caption color={colors.textTertiary}>{trail.total_stops} stops</Caption>
        </View>

        {hasProgress && !trail.user_progress?.is_completed && (
          <View style={[styles.progressWrap, { marginTop: spacing[2] }]}>
            <View style={[styles.progressTrack, { backgroundColor: colors.gray200 }]}>
              <View style={[
                styles.progressFill,
                { width: `${(completed / trail.total_stops) * 100}%`, backgroundColor: colors.primary },
              ]} />
            </View>
            <Caption color={colors.textTertiary} style={{ marginLeft: spacing[2] }}>
              {completed}/{trail.total_stops}
            </Caption>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // Hero card
  hero: {
    width: SCREEN_WIDTH - spacing[8],
    height: 260,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    alignSelf: 'center',
    ...(shadows.xl as object),
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
    height: '80%',
  },
  completedOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(79,138,91,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing[2],
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[5],
    gap: spacing[2],
  },
  badgeRow: {
    flexDirection: 'row',
    gap: spacing[2],
  },
  diffBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  featuredBadge: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  progressWrap: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  progressTrack: {
    flex: 1,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.3)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.accent,
    borderRadius: 2,
  },

  // Compact card
  card: {
    width: 200,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...(shadows.sm as object),
  },
  cardPhotoWrap: {
    position: 'relative',
    height: 120,
  },
  cardPhoto: {
    width: '100%',
    height: '100%',
  },
  cardFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  cardDiffBadge: {
    position: 'absolute',
    top: spacing[2],
    left: spacing[2],
  },
  cardCompletedBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: {
    padding: spacing[3],
    gap: spacing[1],
  },
  cardMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
