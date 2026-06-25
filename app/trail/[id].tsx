import React, { useCallback, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Share, ActivityIndicator, Alert, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows, typography } from '@/theme';
import { RText, Caption, H3, H4 } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import {
  getTrailById,
  followTrail, unfollowTrail,
  markStopCompleted, markStopUncompleted,
} from '@/services/trails';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore, selectCurrentUserId } from '@/stores/authStore';
import type { FoodTrail, FoodTrailStop } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const DIFFICULTY_CONFIG = {
  easy:     { label: 'Easy',     color: colors.success,  icon: '🚶' },
  moderate: { label: 'Moderate', color: colors.accent,   icon: '🚴' },
  hardcore: { label: 'Hardcore', color: colors.primary,  icon: '🔥' },
};

export default function TrailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(selectCurrentUserId);
  const qc = useQueryClient();

  const { data: trail, isLoading } = useQuery<FoodTrail | null>({
    queryKey: queryKeys.trail(id!),
    queryFn: () => getTrailById(id!, userId),
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      follow ? followTrail(userId!, id!) : unfollowTrail(userId!, id!),
    onMutate: async (following) => {
      await qc.cancelQueries({ queryKey: queryKeys.trail(id!) });
      qc.setQueryData<FoodTrail | null>(queryKeys.trail(id!), old =>
        old ? {
          ...old,
          is_following: following,
          follower_count: old.follower_count + (following ? 1 : -1),
        } : old
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: queryKeys.trail(id!) }),
  });

  const stopMutation = useMutation({
    mutationFn: ({ stopId, completed }: { stopId: string; completed: boolean }) =>
      completed
        ? markStopCompleted(userId!, id!, stopId)
        : markStopUncompleted(userId!, id!, stopId),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.trail(id!) }),
  });

  const handleFollow = () => {
    if (!userId) { router.push('/(auth)/login'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    followMutation.mutate(!trail?.is_following);
  };

  const handleStopToggle = (stop: FoodTrailStop) => {
    if (!userId) { router.push('/(auth)/login'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    stopMutation.mutate({ stopId: stop.id, completed: !stop.is_completed });
  };

  const handleShare = useCallback(async () => {
    if (!trail) return;
    await Share.share({
      title: trail.title,
      message: `Check out the ${trail.title} food trail on Rasa! 🗺️ ${trail.total_stops} stops through ${trail.city}.`,
    });
  }, [trail]);

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!trail) {
    return (
      <View style={styles.loader}>
        <RText>Trail not found.</RText>
      </View>
    );
  }

  const difficulty = DIFFICULTY_CONFIG[trail.difficulty];
  const progress = trail.user_progress;
  const completedCount = progress?.completed_stops.length ?? 0;
  const progressPct = trail.total_stops > 0 ? (completedCount / trail.total_stops) * 100 : 0;
  const isCompleted = progress?.is_completed ?? false;

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[10] }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {trail.cover_photo_url ? (
            <Image source={{ uri: trail.cover_photo_url }} style={styles.heroImage} contentFit="cover" transition={400} />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <RText style={{ fontSize: 80 }}>🗺️</RText>
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />

          {/* Nav */}
          <View style={[styles.navBar, { paddingTop: insets.top + spacing[2] }]}>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom overlay */}
          <View style={styles.heroBottom}>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: difficulty.color + 'CC' }]}>
                <RText style={{ fontSize: 12 }}>{difficulty.icon}</RText>
                <RText style={{ fontSize: 11, color: colors.white, fontWeight: '700', marginLeft: 3 }}>
                  {difficulty.label}
                </RText>
              </View>
              {trail.is_featured && (
                <View style={[styles.badge, { backgroundColor: 'rgba(0,0,0,0.5)' }]}>
                  <RText style={{ fontSize: 10, color: colors.accent, fontWeight: '700' }}>⭐ FEATURED</RText>
                </View>
              )}
            </View>

            <H3 style={{ color: colors.white }}>{trail.title}</H3>
            {trail.title_bm && <Caption color="rgba(255,255,255,0.7)">{trail.title_bm}</Caption>}

            <View style={styles.heroMeta}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }}>{trail.city}</Caption>
              <Caption color="rgba(255,255,255,0.4)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
              <Ionicons name="time-outline" size={13} color="rgba(255,255,255,0.7)" />
              <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: 3 }}>
                {trail.estimated_duration_hours ? `~${trail.estimated_duration_hours}h` : 'Self-paced'}
              </Caption>
              {trail.estimated_cost_myr && (
                <>
                  <Caption color="rgba(255,255,255,0.4)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
                  <Caption color="rgba(255,255,255,0.7)">~RM{trail.estimated_cost_myr}</Caption>
                </>
              )}
            </View>
          </View>
        </View>

        {/* Action row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={[styles.followBtn, trail.is_following && styles.followBtnActive]}
            onPress={handleFollow}
            disabled={followMutation.isPending}
          >
            <Ionicons
              name={trail.is_following ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={trail.is_following ? colors.white : colors.primary}
            />
            <RText style={{
              fontSize: 14,
              fontWeight: '700',
              color: trail.is_following ? colors.white : colors.primary,
              marginLeft: 5,
            }}>
              {trail.is_following ? 'Saved' : 'Save Trail'}
            </RText>
          </TouchableOpacity>

          <View style={styles.statsRow}>
            <Caption color={colors.textTertiary}>{trail.follower_count.toLocaleString()} saved</Caption>
            <Caption color={colors.textTertiary} style={{ marginHorizontal: 4 }}>·</Caption>
            <Caption color={colors.textTertiary}>{trail.completion_count.toLocaleString()} completed</Caption>
          </View>
        </View>

        {/* Progress bar */}
        {(completedCount > 0 || isCompleted) && (
          <View style={styles.progressCard}>
            <View style={styles.progressHeader}>
              <RText variant="titleSmall">
                {isCompleted ? '🎉 Trail Complete!' : `${completedCount} of ${trail.total_stops} stops visited`}
              </RText>
              <Caption color={colors.primary} style={{ fontWeight: '700' }}>{Math.round(progressPct)}%</Caption>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
            </View>
          </View>
        )}

        {/* Description */}
        <View style={styles.descSection}>
          <Caption color={colors.textSecondary}>{trail.description}</Caption>
          {trail.best_time && (
            <View style={styles.bestTimeRow}>
              <Ionicons name="sunny-outline" size={14} color={colors.accent} />
              <Caption color={colors.textSecondary} style={{ marginLeft: spacing[2] }}>
                Best time: {trail.best_time}
              </Caption>
            </View>
          )}
        </View>

        {/* Creator */}
        {trail.creator && (
          <TouchableOpacity
            style={styles.creatorRow}
            onPress={() => router.push(`/user/${trail.creator!.username}`)}
          >
            <Avatar uri={trail.creator.avatar_url} name={trail.creator.display_name} size="sm" />
            <Caption style={{ marginLeft: spacing[2] }}>
              Curated by <Caption style={{ fontWeight: '700' }} color={colors.primary}>@{trail.creator.username}</Caption>
            </Caption>
          </TouchableOpacity>
        )}

        {/* Stops */}
        <View style={styles.stopsSection}>
          <H4 style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[3] }}>
            {trail.total_stops} Stops
          </H4>
          {(trail.stops ?? []).map((stop, idx) => (
            <StopRow
              key={stop.id}
              stop={stop}
              index={idx}
              total={trail.total_stops}
              onToggle={() => handleStopToggle(stop)}
              isLoading={stopMutation.isPending && stopMutation.variables?.stopId === stop.id}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

// ─── Stop row component ───────────────────────────────────────

function StopRow({
  stop, index, total, onToggle, isLoading,
}: {
  stop: FoodTrailStop;
  index: number;
  total: number;
  onToggle: () => void;
  isLoading: boolean;
}) {
  const restaurant = stop.restaurant;
  const isLast = index === total - 1;

  return (
    <View style={styles.stopWrapper}>
      {/* Connector line */}
      <View style={styles.stopTimeline}>
        <TouchableOpacity
          style={[styles.stopCheck, stop.is_completed && styles.stopCheckDone]}
          onPress={onToggle}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color={colors.white} />
          ) : stop.is_completed ? (
            <Ionicons name="checkmark" size={14} color={colors.white} />
          ) : (
            <RText style={{ fontSize: 11, fontWeight: '800', color: stop.is_completed ? colors.white : colors.textTertiary }}>
              {index + 1}
            </RText>
          )}
        </TouchableOpacity>
        {!isLast && <View style={styles.stopLine} />}
      </View>

      {/* Content */}
      <View style={[styles.stopContent, stop.is_optional && styles.stopOptional]}>
        {restaurant ? (
          <TouchableOpacity
            style={styles.stopRestaurant}
            onPress={() => router.push(`/restaurant/${restaurant.id}`)}
            activeOpacity={0.85}
          >
            {restaurant.cover_photo_url ? (
              <Image source={{ uri: restaurant.cover_photo_url }} style={styles.stopPhoto} contentFit="cover" />
            ) : (
              <View style={[styles.stopPhoto, styles.stopPhotoFallback]}>
                <RText style={{ fontSize: 20 }}>🍴</RText>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <View style={styles.stopNameRow}>
                <RText variant="titleSmall" numberOfLines={1} style={{ flex: 1 }}>{restaurant.name}</RText>
                {stop.is_optional && <Caption color={colors.textTertiary}>(optional)</Caption>}
              </View>
              <Caption color={colors.textSecondary} numberOfLines={1}>
                {restaurant.area ?? restaurant.city}
              </Caption>
              {stop.recommended_dish && (
                <View style={styles.recommendedDish}>
                  <Ionicons name="star" size={11} color={colors.accent} />
                  <Caption color={colors.accent} style={{ marginLeft: 3, fontWeight: '600' }}>
                    Try: {(stop.recommended_dish as any).name}
                  </Caption>
                </View>
              )}
            </View>
            <Ionicons name="chevron-forward" size={14} color={colors.textTertiary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.stopRestaurant}>
            <RText variant="titleSmall">Stop {index + 1}</RText>
          </View>
        )}

        {stop.tip && (
          <View style={styles.stopTip}>
            <Ionicons name="bulb-outline" size={13} color={colors.accent} />
            <Caption color={colors.textSecondary} style={{ flex: 1, marginLeft: spacing[2] }}>
              {stop.tip}
            </Caption>
          </View>
        )}

        {stop.estimated_spend_myr && (
          <Caption color={colors.textTertiary} style={{ marginTop: spacing[1] }}>
            ~RM{stop.estimated_spend_myr} per person
          </Caption>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },

  // Hero
  hero: { height: 340, position: 'relative' },
  heroImage: { position: 'absolute', width: '100%', height: '100%' },
  heroFallback: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navRight: { flexDirection: 'row', gap: spacing[2] },
  heroBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[5],
    gap: spacing[2],
  },
  badgeRow: { flexDirection: 'row', gap: spacing[2] },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  heroMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },

  // Action row
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  followBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  statsRow: { flexDirection: 'row', alignItems: 'center' },

  // Progress
  progressCard: {
    margin: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    gap: spacing[3],
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.gray200,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 4,
  },

  // Description
  descSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
  },
  bestTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSurface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    alignSelf: 'flex-start',
  },

  // Creator
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },

  // Stops
  stopsSection: {
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  stopWrapper: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
  },
  stopTimeline: {
    width: 40,
    alignItems: 'center',
    paddingTop: spacing[2],
  },
  stopCheck: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopCheckDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  stopLine: {
    width: 2,
    flex: 1,
    backgroundColor: colors.border,
    marginVertical: spacing[1],
    minHeight: 24,
  },
  stopContent: {
    flex: 1,
    paddingBottom: spacing[5],
    paddingLeft: spacing[3],
    paddingTop: spacing[2],
  },
  stopOptional: {
    opacity: 0.75,
  },
  stopRestaurant: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[3],
    ...(shadows.xs as object),
  },
  stopPhoto: {
    width: 56,
    height: 56,
    borderRadius: radius.lg,
  },
  stopPhotoFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  recommendedDish: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[1],
  },
  stopTip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: spacing[3],
    backgroundColor: colors.accentSurface,
    padding: spacing[3],
    borderRadius: radius.lg,
  },
});
