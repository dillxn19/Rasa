import React from 'react';
import {
  View, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator, Share,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, H3, H4, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { queryKeys } from '@/lib/queryClient';
import { useAuthStore, selectCurrentUserId } from '@/stores/authStore';
import { getListById, followList, unfollowList } from '@/services/lists';
import type { List } from '@/types';

export default function ListScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const userId = useAuthStore(selectCurrentUserId);
  const qc = useQueryClient();

  const { data: list, isLoading } = useQuery<List | null>({
    queryKey: queryKeys.list(id!),
    queryFn: () => getListById(id!, userId),
    enabled: !!id,
  });

  const followMutation = useMutation({
    mutationFn: (follow: boolean) =>
      follow ? followList(userId!, id!) : unfollowList(userId!, id!),
    onMutate: async (following) => {
      await qc.cancelQueries({ queryKey: queryKeys.list(id!) });
      qc.setQueryData<List | null>(queryKeys.list(id!), old =>
        old ? { ...old, is_following: following, follower_count: old.follower_count + (following ? 1 : -1) } : old
      );
    },
    onError: () => qc.invalidateQueries({ queryKey: queryKeys.list(id!) }),
  });

  const handleFollowToggle = () => {
    if (!userId) { router.push('/(auth)/login'); return; }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    followMutation.mutate(!list?.is_following);
  };

  if (isLoading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (!list) {
    return (
      <View style={styles.loader}>
        <RText>List not found.</RText>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing[8] }}
      >
        {/* Hero */}
        <View style={styles.hero}>
          {list.cover_photo_url ? (
            <Image source={{ uri: list.cover_photo_url }} style={styles.heroImage} contentFit="cover" />
          ) : (
            <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.heroImage} />
          )}
          <LinearGradient colors={['rgba(0,0,0,0.5)', 'transparent', 'rgba(0,0,0,0.8)']} style={StyleSheet.absoluteFill} />

          {/* Nav */}
          <View style={[styles.navBar, { paddingTop: insets.top + spacing[2] }]}>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() =>
              Share.share({ title: list.title, message: `Check out "${list.title}" on Rasa!` })
            }>
              <Ionicons name="share-outline" size={22} color={colors.white} />
            </TouchableOpacity>
          </View>

          <View style={styles.heroBottom}>
            {list.visibility !== 'public' && (
              <View style={styles.visibilityBadge}>
                <Ionicons name="lock-closed" size={10} color={colors.white} />
                <RText style={{ fontSize: 10, color: colors.white, fontWeight: '600', marginLeft: 3 }}>
                  {list.visibility === 'private' ? 'Private' : 'Friends only'}
                </RText>
              </View>
            )}
            <H3 style={{ color: colors.white }}>{list.title}</H3>
            {list.description && <Caption color="rgba(255,255,255,0.75)">{list.description}</Caption>}
          </View>
        </View>

        {/* Meta bar */}
        <View style={styles.metaBar}>
          {list.user && (
            <TouchableOpacity
              style={styles.authorRow}
              onPress={() => router.push(`/user/${list.user!.username}`)}
            >
              <Avatar uri={list.user.avatar_url} name={list.user.display_name} size="sm" />
              <Caption style={{ marginLeft: spacing[2] }}>
                by <Caption style={{ fontWeight: '700' }} color={colors.primary}>{list.user.display_name}</Caption>
              </Caption>
            </TouchableOpacity>
          )}
          <View style={styles.metaRight}>
            <Caption color={colors.textTertiary}>
              {list.restaurant_count} places · {list.follower_count} saves
            </Caption>
          </View>
        </View>

        {/* Follow button */}
        <View style={styles.followBar}>
          <TouchableOpacity
            style={[styles.followBtn, list.is_following && styles.followBtnActive]}
            onPress={handleFollowToggle}
          >
            <Ionicons
              name={list.is_following ? 'bookmark' : 'bookmark-outline'}
              size={16}
              color={list.is_following ? colors.white : colors.primary}
            />
            <RText style={{
              fontSize: 14,
              fontWeight: '700',
              color: list.is_following ? colors.white : colors.primary,
              marginLeft: 5,
            }}>
              {list.is_following ? 'Saved' : 'Save List'}
            </RText>
          </TouchableOpacity>
        </View>

        {/* Restaurants */}
        <H4 style={{ paddingHorizontal: spacing[4], paddingTop: spacing[5], paddingBottom: spacing[3] }}>
          {list.restaurant_count} Restaurants
        </H4>

        <View style={styles.restaurantList}>
          {(list.items ?? []).map((item) => (
            <View key={item.id} style={styles.restaurantItem}>
              {item.restaurant && <RestaurantCard restaurant={item.restaurant as any} />}
              {item.note && (
                <View style={styles.itemNote}>
                  <Ionicons name="chatbubble-outline" size={13} color={colors.textTertiary} />
                  <Caption color={colors.textSecondary} style={{ flex: 1, marginLeft: spacing[2] }}>
                    {item.note}
                  </Caption>
                </View>
              )}
            </View>
          ))}
          {(list.items ?? []).length === 0 && (
            <View style={styles.empty}>
              <RText style={{ fontSize: 40 }}>📋</RText>
              <Caption style={{ marginTop: spacing[3] }}>No restaurants in this list yet.</Caption>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  hero: { height: 260, position: 'relative' },
  heroImage: { position: 'absolute', width: '100%', height: '100%' },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  heroBottom: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: spacing[5],
    gap: spacing[2],
  },
  visibilityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  metaBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  authorRow: { flexDirection: 'row', alignItems: 'center' },
  metaRight: {},
  followBar: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  followBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
  },
  followBtnActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  restaurantList: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  restaurantItem: { gap: spacing[2] },
  itemNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    backgroundColor: colors.gray50,
    borderRadius: radius.lg,
  },
  empty: {
    alignItems: 'center',
    paddingVertical: spacing[16],
  },
});
