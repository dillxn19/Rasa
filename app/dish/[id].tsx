import React, { useCallback, useState } from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity,
  Share, ActivityIndicator, Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows, typography } from '@/theme';
import { RText, Caption, H3 } from '@/components/ui/Text';
import { StarRating, RatingPicker } from '@/components/ui/StarRating';
import { DishRankingList } from '@/components/dishes/DishRanking';
import { getDishBySlug, getDishById, rateDish, saveDish, unsaveDish } from '@/services/dishes';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore, selectCurrentUserId } from '@/stores/authStore';
import type { Dish } from '@/types';
import { MEAL_TIME_LABELS, CUISINE_LABELS } from '@/types';

export default function DishScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(selectCurrentUserId);
  const qc = useQueryClient();

  const [showRatingModal, setShowRatingModal] = useState(false);
  const [pendingRating, setPendingRating] = useState(0);
  const [ratingNote, setRatingNote] = useState('');

  // id may be a slug or a uuid — try slug first
  const isUuid = /^[0-9a-f-]{36}$/i.test(id ?? '');
  const fetchFn = isUuid
    ? () => getDishById(id!, userId)
    : () => getDishBySlug(id!, userId);

  const { data: dish, isLoading } = useQuery<Dish | null>({
    queryKey: queryKeys.dish(id!),
    queryFn: fetchFn,
    enabled: !!id,
  });

  const saveMutation = useMutation({
    mutationFn: (saved: boolean) =>
      saved ? saveDish(userId!, dish!.id) : unsaveDish(userId!, dish!.id),
    onMutate: async (saving) => {
      await qc.cancelQueries({ queryKey: queryKeys.dish(id!) });
      qc.setQueryData<Dish | null>(queryKeys.dish(id!), old =>
        old ? { ...old, is_saved: saving } : old
      );
    },
    onError: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dish(id!) });
    },
  });

  const rateMutation = useMutation({
    mutationFn: (params: { rating: number; note: string }) => rateDish({
      userId: userId!,
      dishId: dish!.id,
      restaurantId: dish!.top_restaurants?.[0]?.restaurant_id ?? '',
      rating: params.rating,
      note: params.note,
    }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dish(id!) });
      setShowRatingModal(false);
      setRatingNote('');
      Alert.alert('Thanks!', 'Your dish rating has been saved.');
    },
  });

  const handleShare = useCallback(async () => {
    if (!dish) return;
    await Share.share({
      title: dish.name,
      message: `Check out ${dish.name} on Rasa! 🍜 The best spots to get it are rated by locals.`,
    });
  }, [dish]);

  const handleSave = () => {
    if (!userId) { router.push('/(auth)/login'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    saveMutation.mutate(!dish?.is_saved);
  };

  const handleRateSubmit = () => {
    if (pendingRating === 0) return;
    rateMutation.mutate({ rating: pendingRating, note: ratingNote });
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!dish) {
    return (
      <View style={styles.loader}>
        <RText>Dish not found.</RText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }} showsVerticalScrollIndicator={false}>
        {/* Hero */}
        <View style={styles.hero}>
          {dish.cover_photo_url ? (
            <Image source={{ uri: dish.cover_photo_url }} style={styles.heroImage} contentFit="cover" transition={400} />
          ) : (
            <View style={[styles.heroImage, styles.heroFallback]}>
              <RText style={{ fontSize: 80 }}>🍜</RText>
            </View>
          )}
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.7)']} style={StyleSheet.absoluteFill} />

          {/* Nav bar */}
          <View style={[styles.navBar, { paddingTop: insets.top + spacing[2] }]}>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn} onPress={handleSave}>
                <Ionicons
                  name={dish.is_saved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={dish.is_saved ? colors.accent : colors.white}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom overlay */}
          <View style={styles.heroBottom}>
            <View style={styles.mealTimeRow}>
              {dish.best_meal_times.map(mt => (
                <View key={mt} style={styles.mealPill}>
                  <RText style={{ fontSize: 10, color: colors.white, fontWeight: '600' }}>
                    {MEAL_TIME_LABELS[mt as keyof typeof MEAL_TIME_LABELS] ?? mt}
                  </RText>
                </View>
              ))}
              {dish.is_halal_by_default && (
                <View style={[styles.mealPill, { backgroundColor: colors.halal }]}>
                  <RText style={{ fontSize: 10, color: colors.white, fontWeight: '700' }}>HALAL</RText>
                </View>
              )}
            </View>
            <H3 style={{ color: colors.white }}>{dish.name}</H3>
            {dish.name_bm && dish.name_bm !== dish.name && (
              <Caption color="rgba(255,255,255,0.7)">{dish.name_bm}</Caption>
            )}
            {dish.name_zh && (
              <Caption color="rgba(255,255,255,0.7)">{dish.name_zh}</Caption>
            )}
          </View>
        </View>

        {/* Rating summary */}
        <View style={styles.ratingCard}>
          <View style={styles.ratingMain}>
            <RText style={typography.special.rating}>{dish.average_rating.toFixed(1)}</RText>
            <View style={styles.ratingDetails}>
              <StarRating value={dish.average_rating} size={18} readonly />
              <Caption style={{ marginTop: spacing[1] }}>
                {dish.total_ratings.toLocaleString()} ratings · {dish.total_restaurant_count} restaurants
              </Caption>
            </View>
          </View>

          {/* Rate CTA */}
          <TouchableOpacity
            style={styles.rateBtn}
            onPress={() => {
              if (!userId) { router.push('/(auth)/login'); return; }
              setPendingRating(dish.user_rating?.rating ?? 0);
              setShowRatingModal(true);
            }}
          >
            <Ionicons name="star" size={14} color={colors.white} />
            <RText style={{ fontSize: 13, fontWeight: '700', color: colors.white, marginLeft: 4 }}>
              {dish.user_rating ? 'Edit rating' : 'Rate this dish'}
            </RText>
          </TouchableOpacity>
        </View>

        {/* Fun fact */}
        {dish.fun_fact && (
          <View style={styles.funFactCard}>
            <RText style={{ fontSize: 22 }}>💡</RText>
            <RText variant="bodyMedium" style={{ flex: 1, marginLeft: spacing[3] }}>
              {dish.fun_fact}
            </RText>
          </View>
        )}

        {/* Description */}
        {dish.description && (
          <View style={styles.section}>
            <Caption color={colors.textSecondary}>{dish.description}</Caption>
          </View>
        )}

        {/* Cuisine + Category */}
        {dish.cuisine_type && (
          <View style={styles.pillRow}>
            <View style={styles.infoPill}>
              <Caption style={{ fontWeight: '600' }}>{CUISINE_LABELS[dish.cuisine_type] ?? dish.cuisine_type}</Caption>
            </View>
            <View style={styles.infoPill}>
              <Caption style={{ fontWeight: '600' }}>{dish.category.replace('_', ' ')}</Caption>
            </View>
            {dish.is_vegetarian_by_default && (
              <View style={[styles.infoPill, { backgroundColor: colors.successLight }]}>
                <Caption style={{ fontWeight: '600' }} color={colors.success}>🌿 Vegetarian</Caption>
              </View>
            )}
          </View>
        )}

        {/* Best restaurants */}
        <View style={styles.rankingSection}>
          <View style={styles.sectionHeader}>
            <RText variant="h4">Best Places to Get It</RText>
            <Caption color={colors.textTertiary}>{dish.total_restaurant_count} restaurants</Caption>
          </View>
          <DishRankingList
            entries={dish.top_restaurants ?? []}
            emptyMessage="No restaurants have listed this dish yet"
          />
        </View>
      </ScrollView>

      {/* Inline rating modal (simple) */}
      {showRatingModal && (
        <View style={styles.ratingModal}>
          <View style={styles.ratingModalContent}>
            <View style={styles.ratingModalHandle} />
            <RText variant="titleLarge" style={{ marginBottom: spacing[4], textAlign: 'center' }}>
              How was the {dish.name}?
            </RText>
            <RatingPicker
              value={pendingRating}
              onChange={setPendingRating}
            />
            <View style={styles.ratingActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowRatingModal(false)}>
                <RText color={colors.textSecondary}>Cancel</RText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.submitBtn, pendingRating === 0 && styles.submitBtnDisabled]}
                onPress={handleRateSubmit}
                disabled={pendingRating === 0 || rateMutation.isPending}
              >
                {rateMutation.isPending
                  ? <ActivityIndicator color={colors.white} size="small" />
                  : <RText style={{ color: colors.white, fontWeight: '700' }}>Save Rating</RText>
                }
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
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
    gap: spacing[1],
  },
  mealTimeRow: { flexDirection: 'row', gap: spacing[2], flexWrap: 'wrap', marginBottom: spacing[2] },
  mealPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Rating card
  ratingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    margin: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    ...(shadows.sm as object),
  },
  ratingMain: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  ratingDetails: {},
  rateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },

  // Fun fact
  funFactCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[4],
    backgroundColor: colors.accentSurface,
    borderRadius: radius.xl,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },

  // Section
  section: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
  },
  pillRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[5],
  },
  infoPill: {
    backgroundColor: colors.gray100,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },

  // Ranking section
  rankingSection: {
    backgroundColor: colors.background,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },

  // Rating modal (inline overlay)
  ratingModal: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  ratingModalContent: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    padding: spacing[5],
    paddingBottom: spacing[10],
  },
  ratingModalHandle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  ratingActions: {
    flexDirection: 'row',
    gap: spacing[3],
    marginTop: spacing[5],
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.gray100,
  },
  submitBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    backgroundColor: colors.primary,
  },
  submitBtnDisabled: {
    opacity: 0.4,
  },
});
