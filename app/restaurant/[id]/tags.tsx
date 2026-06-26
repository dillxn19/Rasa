import React from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, H3, Caption, Body } from '@/components/ui/Text';
import { FoodTagChip } from '@/components/ui/FoodTag';
import { useAuthStore, selectCurrentUserId } from '@/stores/authStore';
import { getRestaurantFoodTags, toggleFoodTag } from '@/services/dishes';
import { getRestaurantById } from '@/services/restaurants';
import { queryKeys } from '@/lib/queryClient';
import {
  FOOD_TAG_LABELS, FOOD_TAG_EMOJIS, type FoodTagType,
} from '@/types';

const ALL_TAGS = Object.keys(FOOD_TAG_LABELS) as FoodTagType[];

export default function RestaurantTagsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const userId = useAuthStore(selectCurrentUserId);
  const qc = useQueryClient();

  const { data: restaurant } = useQuery({
    queryKey: queryKeys.restaurant(id),
    queryFn: () => getRestaurantById(id),
    enabled: !!id,
  });

  const { data: existingTags, isLoading } = useQuery({
    queryKey: ['restaurant-tags', id, userId],
    queryFn: () => getRestaurantFoodTags(id, userId),
    enabled: !!id,
  });

  const toggleMutation = useMutation({
    mutationFn: (tag: FoodTagType) => {
      if (!userId) return Promise.resolve({ added: false });
      return toggleFoodTag(userId, id, tag);
    },
    onMutate: async (tag) => {
      await qc.cancelQueries({ queryKey: ['restaurant-tags', id, userId] });
      const prev = qc.getQueryData(['restaurant-tags', id, userId]);
      qc.setQueryData(['restaurant-tags', id, userId], (old: any) => {
        if (!old) return old;
        const existing = old.find((t: any) => t.tag === tag);
        if (existing) {
          return old.map((t: any) =>
            t.tag === tag
              ? { ...t, count: t.user_has_tagged ? t.count - 1 : t.count + 1, user_has_tagged: !t.user_has_tagged }
              : t
          );
        }
        return [...old, { tag, count: 1, user_has_tagged: true }];
      });
      return { prev };
    },
    onError: (_err, _tag, ctx) => {
      if (ctx?.prev) qc.setQueryData(['restaurant-tags', id, userId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-tags', id, userId] });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const tagMap = new Map(existingTags?.map(t => [t.tag, t]) ?? []);

  const sortedTags = [...ALL_TAGS].sort((a, b) => {
    const countA = tagMap.get(a)?.count ?? 0;
    const countB = tagMap.get(b)?.count ?? 0;
    return countB - countA;
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <H3 numberOfLines={1}>Community Tags</H3>
          {restaurant && (
            <Caption color={colors.textSecondary} numberOfLines={1}>{restaurant.name}</Caption>
          )}
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.infoBar}>
        <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
        <Body color={colors.textSecondary} style={{ marginLeft: spacing[2], flex: 1 }}>
          Tap tags that describe this place. Your votes help others discover it.
        </Body>
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.tagsGrid}
        >
          {sortedTags.map(tag => {
            const entry = tagMap.get(tag);
            const isSelected = entry?.user_has_tagged ?? false;
            const count = entry?.count ?? 0;

            return (
              <TouchableOpacity
                key={tag}
                style={styles.tagWrapper}
                onPress={() => toggleMutation.mutate(tag)}
                activeOpacity={0.8}
              >
                <FoodTagChip
                  tag={tag}
                  count={count > 0 ? count : undefined}
                  isSelected={isSelected}
                  size="md"
                />
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing[1] },
  headerCenter: { flex: 1, alignItems: 'center' },
  infoBar: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    backgroundColor: colors.gray50,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tagsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[10],
  },
  tagWrapper: {},
});
