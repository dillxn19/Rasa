import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, H3, Body, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { TasteMatchBadge } from '@/components/users/TasteMatchBadge';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { useAuthStore } from '@/stores/authStore';
import { getUserByUsername, getUserReviews, followUser, unfollowUser } from '@/services/users';
import { queryKeys } from '@/lib/queryClient';
import { TASTE_PROFILE_LABELS } from '@/types';
import { shareViaWhatsApp } from '@/lib/share';

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const isOwnProfile = currentUser?.username === username;

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.user(username),
    queryFn: () => getUserByUsername(username, currentUser?.id),
    enabled: !!username,
  });

  const { data: reviews } = useQuery({
    queryKey: queryKeys.userReviews(user?.id ?? ''),
    queryFn: () => getUserReviews(user!.id),
    enabled: !!user,
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !user) return;
      if (user.is_following) {
        await unfollowUser(currentUser.id, user.id);
      } else {
        await followUser(currentUser.id, user.id);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user(username) });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  if (isLoading || !user) return null;

  const tasteProfile = user.taste_profile ? TASTE_PROFILE_LABELS[user.taste_profile] : null;
  const matchScore = user.taste_match_score;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[colors.secondary, colors.primaryDark]}
            style={StyleSheet.absoluteFill}
          />
          <SafeAreaView edges={['top']}>
            <View style={styles.navBar}>
              <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.navBtn}>
                <Ionicons name="ellipsis-horizontal" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Profile */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <Avatar
              uri={user.avatar_url}
              name={user.display_name}
              size="2xl"
              showBorder
              borderColor={colors.white}
            />
            {!isOwnProfile && (
              <View style={styles.followActions}>
                <Button
                  label={user.is_following ? 'Following' : 'Follow'}
                  variant={user.is_following ? 'outline' : 'primary'}
                  size="md"
                  onPress={() => followMutation.mutate()}
                  isLoading={followMutation.isPending}
                />
                {user.is_following && (
                  <TouchableOpacity
                    style={styles.messageBtn}
                    onPress={() => shareViaWhatsApp(`Hey, check out ${user.display_name}'s food reviews on Rasa! rasa.my/user/${user.username}`)}
                  >
                    <RText style={{ fontSize: 18 }}>💬</RText>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>

          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <H3>{user.display_name}</H3>
              {user.is_verified && (
                <Ionicons name="checkmark-circle" size={18} color={colors.primary} style={{ marginLeft: 6 }} />
              )}
            </View>
            <Caption>@{user.username}</Caption>

            {tasteProfile && (
              <View style={styles.tasteTag}>
                <RText style={{ fontSize: 14 }}>{tasteProfile.emoji}</RText>
                <RText variant="labelMedium" color={colors.primary} style={{ marginLeft: spacing[2] }}>
                  {tasteProfile.label}
                </RText>
              </View>
            )}

            {user.bio && (
              <Body color={colors.textSecondary} style={{ marginTop: spacing[2] }}>
                {user.bio}
              </Body>
            )}

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
              <Caption style={{ marginLeft: 3 }}>{user.city}</Caption>
            </View>
          </View>

          {/* Taste match card */}
          {!isOwnProfile && matchScore !== undefined && matchScore > 0 && (
            <View style={styles.matchSection}>
              <TasteMatchBadge score={matchScore} />
            </View>
          )}

          {/* Stats */}
          <View style={styles.stats}>
            <StatItem value={user.total_reviews} label="Reviews" />
            <StatDivider />
            <StatItem
              value={user.follower_count}
              label="Followers"
              onPress={() => router.push(`/user/${username}/followers`)}
            />
            <StatDivider />
            <StatItem
              value={user.following_count}
              label="Following"
              onPress={() => router.push(`/user/${username}/following`)}
            />
            <StatDivider />
            <StatItem value={user.total_visits} label="Visited" />
          </View>
        </View>

        {/* Reviews */}
        <View style={styles.reviewsSection}>
          <RText variant="h4" style={styles.sectionTitle}>
            {user.is_following || isOwnProfile ? 'Reviews' : `${user.display_name.split(' ')[0]}'s Reviews`}
          </RText>

          {(reviews ?? []).length === 0 ? (
            <View style={styles.emptyReviews}>
              <Caption>No public reviews yet</Caption>
            </View>
          ) : (
            (reviews ?? []).map(review => (
              <TouchableOpacity
                key={review.id}
                style={styles.reviewCard}
                onPress={() => review.restaurant && router.push(`/restaurant/${review.restaurant.id}`)}
                activeOpacity={0.85}
              >
                <View style={styles.reviewHeader}>
                  <RText variant="titleMedium" numberOfLines={1} style={{ flex: 1 }}>
                    {review.restaurant?.name}
                  </RText>
                  <RText variant="titleMedium" color={colors.starFilled}>
                    {'★'.repeat(Math.round(review.rating))}
                  </RText>
                </View>
                {review.content && (
                  <Body color={colors.textSecondary} numberOfLines={2}>
                    {review.content}
                  </Body>
                )}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function StatItem({ value, label, onPress }: { value: number; label: string; onPress?: () => void }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper style={styles.statItem} onPress={onPress} activeOpacity={0.7}>
      <RText variant="stat">{value.toLocaleString()}</RText>
      <Caption>{label}</Caption>
    </Wrapper>
  );
}

function StatDivider() {
  return <View style={styles.statDivider} />;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { height: 140 },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blackTransparent40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileSection: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -44,
    marginBottom: spacing[3],
  },
  followActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginTop: spacing[8],
  },
  messageBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameSection: { gap: spacing[1], marginBottom: spacing[4] },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  tasteTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    marginTop: spacing[2],
  },
  locationRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[1] },
  matchSection: { marginBottom: spacing[4] },
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[4],
  },
  statItem: { flex: 1, alignItems: 'center', gap: 2 },
  statDivider: { width: 1, backgroundColor: colors.border, marginHorizontal: spacing[2] },
  reviewsSection: { padding: spacing[4] },
  sectionTitle: { marginBottom: spacing[4] },
  reviewCard: {
    padding: spacing[4],
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    marginBottom: spacing[3],
    gap: spacing[2],
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  emptyReviews: { alignItems: 'center', paddingVertical: spacing[10] },
});
