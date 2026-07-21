import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
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
import { ReviewCard } from '@/components/profile/ReviewCard';
import { SavedRestaurantCard } from '@/components/profile/SavedRestaurantCard';
import { useAuthStore } from '@/stores/authStore';
import { getUserByUsername, getUserReviews, followUser, unfollowUser } from '@/services/users';
import { getSavedRestaurants } from '@/services/restaurants';
import { queryKeys } from '@/lib/queryClient';
import { TASTE_PROFILE_LABELS, CATEGORY_LABELS } from '@/types';
import { shareViaWhatsApp } from '@/lib/share';
import type { Review, Restaurant } from '@/types';

type ContentTab = 'reviews' | 'saved';
type SortKey = 'date' | 'rating';

const REVIEW_FILTERS = [
  { label: 'All', value: 'all' },
  { label: 'Hawker & Mamak', value: 'hawker_mamak' },
  { label: 'Cafe & Kopitiam', value: 'cafe_kopitiam' },
  { label: 'Restaurants', value: 'dining' },
  { label: 'Night Markets', value: 'street' },
];

const FILTER_MAP: Record<string, string[]> = {
  all: [],
  hawker_mamak: ['hawker', 'mamak', 'food_court'],
  cafe_kopitiam: ['cafe', 'kopitiam'],
  dining: ['restaurant', 'fine_dining', 'fast_food', 'bar'],
  street: ['night_market'],
};

export default function UserProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: currentUser } = useAuthStore();
  const qc = useQueryClient();
  const isOwnProfile = currentUser?.username === username;

  const [activeTab, setActiveTab] = useState<ContentTab>('reviews');
  const [reviewFilter, setReviewFilter] = useState('all');
  const [sortKey, setSortKey] = useState<SortKey>('date');

  const { data: user, isLoading } = useQuery({
    queryKey: queryKeys.user(username),
    queryFn: () => getUserByUsername(username, currentUser?.id),
    enabled: !!username,
  });

  const { data: reviews = [], isLoading: reviewsLoading } = useQuery({
    queryKey: queryKeys.userReviews(user?.id ?? ''),
    queryFn: () => getUserReviews(user!.id),
    enabled: !!user,
  });

  const { data: saved = [], isLoading: savedLoading } = useQuery({
    queryKey: queryKeys.savedRestaurants(user?.id ?? ''),
    queryFn: () => getSavedRestaurants(user!.id),
    enabled: !!user && activeTab === 'saved',
  });

  const followMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !user) return;
      if (user.is_following) await unfollowUser(currentUser.id, user.id);
      else await followUser(currentUser.id, user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.user(username) });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  const filteredReviews = useMemo(() => {
    const categories = FILTER_MAP[reviewFilter] ?? [];
    const filtered = categories.length === 0
      ? reviews
      : reviews.filter(r => r.restaurant && categories.includes(r.restaurant.category));
    if (sortKey === 'rating') return [...filtered].sort((a, b) => b.rating - a.rating);
    return filtered; // already date-sorted from API
  }, [reviews, reviewFilter, sortKey]);

  if (isLoading || !user) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  const tasteProfile = user.taste_profile ? TASTE_PROFILE_LABELS[user.taste_profile] : null;
  const matchScore = user.taste_match_score;

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Hero gradient */}
        <View style={styles.hero}>
          <LinearGradient colors={[colors.secondary, colors.primaryDark]} style={StyleSheet.absoluteFill} />
          <SafeAreaView edges={['top']}>
            <View style={styles.navBar}>
              <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
                <Ionicons name="arrow-back" size={22} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => shareViaWhatsApp(`Check out ${user.display_name}'s food reviews on Rasa! rasa.my/user/${user.username}`)}
              >
                <Ionicons name="share-outline" size={22} color={colors.white} />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Profile section */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <Avatar uri={user.avatar_url} name={user.display_name} size="2xl" showBorder borderColor={colors.white} />
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
              <Body color={colors.textSecondary} style={{ marginTop: spacing[2] }}>{user.bio}</Body>
            )}
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color={colors.textTertiary} />
              <Caption style={{ marginLeft: 3 }}>{user.city}</Caption>
            </View>
          </View>

          {!isOwnProfile && matchScore !== undefined && matchScore > 0 && (
            <View style={styles.matchSection}>
              <TasteMatchBadge score={matchScore} />
            </View>
          )}

          <View style={styles.stats}>
            <StatItem value={user.total_reviews} label="Reviews" />
            <StatDivider />
            <StatItem value={user.follower_count} label="Followers" onPress={() => router.push(`/user/${username}/followers`)} />
            <StatDivider />
            <StatItem value={user.following_count} label="Following" onPress={() => router.push(`/user/${username}/following`)} />
            <StatDivider />
            <StatItem value={user.total_visits} label="Visited" />
          </View>
        </View>

        {/* Tab buttons */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'reviews' && styles.tabBtnActive]}
            onPress={() => setActiveTab('reviews')}
          >
            <Ionicons
              name="star"
              size={15}
              color={activeTab === 'reviews' ? colors.primary : colors.textTertiary}
            />
            <RText
              variant="labelMedium"
              color={activeTab === 'reviews' ? colors.primary : colors.textSecondary}
              style={{ marginLeft: spacing[1] }}
            >
              Reviews {reviews.length > 0 ? `(${reviews.length})` : ''}
            </RText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === 'saved' && styles.tabBtnActive]}
            onPress={() => setActiveTab('saved')}
          >
            <Ionicons
              name="bookmark"
              size={15}
              color={activeTab === 'saved' ? colors.primary : colors.textTertiary}
            />
            <RText
              variant="labelMedium"
              color={activeTab === 'saved' ? colors.primary : colors.textSecondary}
              style={{ marginLeft: spacing[1] }}
            >
              Saved
            </RText>
          </TouchableOpacity>
        </View>

        {/* Reviews tab */}
        {activeTab === 'reviews' && (
          <View style={styles.contentSection}>
            {/* Filter chips */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
              {REVIEW_FILTERS.map(f => (
                <TouchableOpacity
                  key={f.value}
                  style={[styles.filterChip, reviewFilter === f.value && styles.filterChipActive]}
                  onPress={() => setReviewFilter(f.value)}
                >
                  <RText
                    variant="labelMedium"
                    color={reviewFilter === f.value ? colors.white : colors.textSecondary}
                  >
                    {f.label}
                  </RText>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Sort toggle */}
            <View style={styles.sortRow}>
              <Caption color={colors.textTertiary}>{filteredReviews.length} reviews</Caption>
              <View style={styles.sortBtns}>
                <TouchableOpacity
                  style={[styles.sortBtn, sortKey === 'date' && styles.sortBtnActive]}
                  onPress={() => setSortKey('date')}
                >
                  <Caption color={sortKey === 'date' ? colors.primary : colors.textTertiary} style={{ fontWeight: '600' }}>
                    Newest
                  </Caption>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.sortBtn, sortKey === 'rating' && styles.sortBtnActive]}
                  onPress={() => setSortKey('rating')}
                >
                  <Caption color={sortKey === 'rating' ? colors.primary : colors.textTertiary} style={{ fontWeight: '600' }}>
                    Top rated
                  </Caption>
                </TouchableOpacity>
              </View>
            </View>

            {reviewsLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
            ) : filteredReviews.length === 0 ? (
              <View style={styles.emptyState}>
                <RText style={{ fontSize: 32, lineHeight: 42 }}>✍️</RText>
                <Caption color={colors.textSecondary} style={{ marginTop: spacing[3] }}>
                  {reviews.length === 0 ? 'No public reviews yet' : 'No reviews in this category'}
                </Caption>
              </View>
            ) : (
              <View style={styles.reviewsList}>
                {filteredReviews.map(review => (
                  <ReviewCard key={review.id} review={review} />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Saved tab */}
        {activeTab === 'saved' && (
          <View style={styles.contentSection}>
            {savedLoading ? (
              <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
            ) : saved.length === 0 ? (
              <View style={styles.emptyState}>
                <RText style={{ fontSize: 32, lineHeight: 42 }}>🔖</RText>
                <Caption color={colors.textSecondary} style={{ marginTop: spacing[3] }}>No saved restaurants yet</Caption>
              </View>
            ) : (
              <View style={styles.savedList}>
                {saved.map(restaurant => (
                  <SavedRestaurantCard key={restaurant.id} restaurant={restaurant} />
                ))}
              </View>
            )}
          </View>
        )}

        <View style={{ height: spacing[10] }} />
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
  loadingContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  hero: { height: 170 },
  navBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.blackTransparent40,
    alignItems: 'center', justifyContent: 'center',
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
    width: 44, height: 44, borderRadius: 22,
    borderWidth: 1.5, borderColor: colors.border,
    alignItems: 'center', justifyContent: 'center',
  },
  nameSection: { gap: spacing[1], marginBottom: spacing[4] },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  tasteTag: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.primarySurface,
    alignSelf: 'flex-start',
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
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

  // Tab buttons
  tabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tabBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
    gap: spacing[1],
  },
  tabBtnActive: {
    borderBottomColor: colors.primary,
  },

  // Content
  contentSection: { paddingBottom: spacing[6] },
  filterRow: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  sortRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
  },
  sortBtns: { flexDirection: 'row', gap: spacing[1] },
  sortBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sortBtnActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: spacing[14],
    paddingHorizontal: spacing[8],
  },

  // Review + saved lists
  reviewsList: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[3] },
  savedList: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[3] },
});
