import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption, H2, Body } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { getUserBadges, getUserPassport, getUserReviews, getUserLists } from '@/services/users';
import { getSavedRestaurants } from '@/services/restaurants';
import { getUserSavedDishes } from '@/services/dishes';
import { queryKeys } from '@/lib/queryClient';
import { TASTE_PROFILE_LABELS, CUISINE_LABELS, DIETARY_LABELS } from '@/types';
import type { Review, Badge, List } from '@/types';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { DishChip } from '@/components/dishes/DishCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabKey = 'reviews' | 'visited' | 'lists' | 'passport';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabKey>('reviews');

  const { data: badges } = useQuery({
    queryKey: queryKeys.userBadges(profile?.id ?? ''),
    queryFn: () => getUserBadges(profile!.id),
    enabled: !!profile,
  });

  const { data: passport } = useQuery({
    queryKey: queryKeys.userPassport(profile?.id ?? ''),
    queryFn: () => getUserPassport(profile!.id),
    enabled: !!profile,
  });

  const { data: reviews } = useQuery({
    queryKey: queryKeys.userReviews(profile?.id ?? ''),
    queryFn: () => getUserReviews(profile!.id),
    enabled: !!profile && activeTab === 'reviews',
  });

  const { data: savedRestaurants } = useQuery({
    queryKey: queryKeys.savedRestaurants(profile?.id ?? ''),
    queryFn: () => getSavedRestaurants(profile!.id),
    enabled: !!profile && activeTab === 'visited',
  });

  const { data: savedDishes } = useQuery({
    queryKey: queryKeys.savedDishes(profile?.id ?? ''),
    queryFn: () => getUserSavedDishes(profile!.id),
    enabled: !!profile && activeTab === 'visited',
  });

  const { data: userLists } = useQuery({
    queryKey: queryKeys.userLists(profile?.id ?? ''),
    queryFn: () => getUserLists(profile!.id),
    enabled: !!profile && activeTab === 'lists',
  });

  if (!profile) return null;

  const tasteProfile = profile.taste_profile
    ? TASTE_PROFILE_LABELS[profile.taste_profile]
    : null;

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'reviews', label: 'Reviews', count: profile.total_reviews },
    { key: 'visited', label: 'Visited', count: passport?.restaurants_visited ?? 0 },
    { key: 'lists', label: 'Lists', count: profile.total_lists },
    { key: 'passport', label: 'Passport', count: badges?.length ?? 0 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Cover + Header */}
        <View style={styles.coverContainer}>
          {profile.cover_url ? (
            <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.primaryDark]}
              style={styles.cover}
            />
          )}
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.3)']}
            style={StyleSheet.absoluteFill}
          />
        </View>

        {/* Profile info */}
        <View style={styles.profileSection}>
          <View style={styles.avatarRow}>
            <View style={styles.avatarContainer}>
              <Avatar
                uri={profile.avatar_url}
                name={profile.display_name}
                size="2xl"
                showBorder
                borderColor={colors.white}
              />
            </View>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push('/edit-profile')}
              >
                <Ionicons name="pencil" size={16} color={colors.textPrimary} />
                <RText variant="labelMedium" style={{ marginLeft: 6 }}>Edit</RText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsBtn} onPress={signOut}>
                <Ionicons name="settings-outline" size={22} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Name and bio */}
          <View style={styles.nameSection}>
            <View style={styles.nameRow}>
              <H2>{profile.display_name}</H2>
              {profile.is_verified && (
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} style={{ marginLeft: 6 }} />
              )}
            </View>
            <Caption>@{profile.username}</Caption>

            {tasteProfile && (
              <View style={styles.tasteProfileBadge}>
                <RText style={{ fontSize: 16 }}>{tasteProfile.emoji}</RText>
                <RText variant="labelMedium" color={colors.primary} style={{ marginLeft: spacing[2] }}>
                  {tasteProfile.label}
                </RText>
              </View>
            )}

            {profile.bio && (
              <Body color={colors.textSecondary} style={{ marginTop: spacing[2] }}>
                {profile.bio}
              </Body>
            )}

            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={14} color={colors.textTertiary} />
              <Caption style={{ marginLeft: 4 }}>{profile.city}, Malaysia</Caption>
            </View>
          </View>

          {/* Stats */}
          <View style={styles.stats}>
            <StatItem value={profile.total_reviews} label="Reviews" />
            <View style={styles.statDivider} />
            <StatItem
              value={profile.follower_count}
              label="Followers"
              onPress={() => router.push(`/user/${profile.username}/followers`)}
            />
            <View style={styles.statDivider} />
            <StatItem
              value={profile.following_count}
              label="Following"
              onPress={() => router.push(`/user/${profile.username}/following`)}
            />
            <View style={styles.statDivider} />
            <StatItem value={passport?.cities_visited.length ?? 0} label="Cities" />
          </View>

          {/* Badges preview */}
          {(badges?.length ?? 0) > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.badgesRow}
            >
              {(badges ?? []).slice(0, 8).map(badge => (
                <View key={badge.id} style={styles.badgeItem}>
                  <RText style={{ fontSize: 24 }}>{badge.icon_emoji ?? '🏅'}</RText>
                </View>
              ))}
              {(badges?.length ?? 0) > 8 && (
                <View style={[styles.badgeItem, styles.badgeMore]}>
                  <RText variant="labelSmall" color={colors.textSecondary}>
                    +{(badges?.length ?? 0) - 8}
                  </RText>
                </View>
              )}
            </ScrollView>
          )}
        </View>

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && styles.tabActive]}
              onPress={() => setActiveTab(tab.key)}
            >
              <RText
                variant="labelMedium"
                color={activeTab === tab.key ? colors.primary : colors.textSecondary}
              >
                {tab.label}
              </RText>
              {tab.count > 0 && (
                <Caption color={activeTab === tab.key ? colors.primary : colors.textTertiary}>
                  {tab.count}
                </Caption>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Taste DNA — shown when on reviews or visited tab */}
        {(activeTab === 'reviews' || activeTab === 'visited') &&
          profile.favorite_cuisines && profile.favorite_cuisines.length > 0 && (
          <TasteDNA
            cuisines={profile.favorite_cuisines}
            dietary={profile.dietary_preferences ?? []}
          />
        )}

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 'reviews' && (
            <ReviewsList reviews={reviews ?? []} />
          )}
          {activeTab === 'visited' && (
            <VisitedTab
              restaurants={savedRestaurants ?? []}
              dishes={savedDishes ?? []}
            />
          )}
          {activeTab === 'lists' && (
            <ListsTab lists={userLists ?? []} />
          )}
          {activeTab === 'passport' && (
            <PassportView passport={passport} badges={badges ?? []} />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
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

function ReviewsList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <RText style={{ fontSize: 32 }}>✍️</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No reviews yet</RText>
        <Caption color={colors.textSecondary}>Rate restaurants to build your profile</Caption>
      </View>
    );
  }

  return (
    <View style={styles.reviewsList}>
      {reviews.map(review => (
        <TouchableOpacity
          key={review.id}
          style={styles.reviewItem}
          onPress={() => review.restaurant && router.push(`/restaurant/${review.restaurant.id}`)}
          activeOpacity={0.85}
        >
          {review.restaurant?.cover_photo_url && (
            <Image
              source={{ uri: review.restaurant.cover_photo_url }}
              style={styles.reviewPhoto}
              contentFit="cover"
            />
          )}
          <View style={styles.reviewInfo}>
            <RText variant="titleSmall" numberOfLines={1}>
              {review.restaurant?.name}
            </RText>
            <View style={styles.reviewRatingRow}>
              <RText variant="labelMedium" color={colors.starFilled}>
                {'★'.repeat(Math.round(review.rating))}
              </RText>
              <RText variant="caption" color={colors.textTertiary} style={{ marginLeft: spacing[2] }}>
                {review.rating}/5
              </RText>
            </View>
            {review.content && (
              <Caption numberOfLines={2}>{review.content}</Caption>
            )}
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

function PassportView({ passport, badges }: { passport: any; badges: Badge[] }) {
  const stats = [
    { label: 'Restaurants', value: passport?.restaurants_visited ?? 0, icon: '🍽️' },
    { label: 'Cities', value: passport?.cities_visited?.length ?? 0, icon: '🏙️' },
    { label: 'States', value: passport?.states_visited?.length ?? 0, icon: '🗺️' },
    { label: 'Cuisines', value: passport?.cuisines_tried?.length ?? 0, icon: '🌍' },
    { label: 'Reviews', value: passport?.reviews_written ?? 0, icon: '✍️' },
    { label: 'Likes', value: passport?.total_likes_received ?? 0, icon: '❤️' },
  ];

  return (
    <View style={styles.passport}>
      <View style={styles.passportStats}>
        {stats.map(s => (
          <View key={s.label} style={styles.passportStat}>
            <RText style={{ fontSize: 24 }}>{s.icon}</RText>
            <RText variant="stat" style={{ marginTop: spacing[1] }}>{s.value}</RText>
            <Caption>{s.label}</Caption>
          </View>
        ))}
      </View>

      <View style={styles.badgesSection}>
        <RText variant="h4" style={{ marginBottom: spacing[4] }}>Badges</RText>
        {badges.length === 0 ? (
          <View style={styles.emptyTab}>
            <RText style={{ fontSize: 32 }}>🏅</RText>
            <Caption>Visit more restaurants to earn badges</Caption>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {badges.map(badge => (
              <View key={badge.id} style={styles.badgeCard}>
                <RText style={{ fontSize: 32 }}>{badge.icon_emoji ?? '🏅'}</RText>
                <RText variant="titleSmall" align="center" numberOfLines={2}>
                  {badge.name}
                </RText>
                <Caption align="center" numberOfLines={2}>
                  {badge.description}
                </Caption>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

function TasteDNA({ cuisines, dietary }: { cuisines: string[]; dietary: string[] }) {
  return (
    <View style={styles.tasteDNA}>
      <RText variant="labelMedium" color={colors.textTertiary} style={styles.tasteDNALabel}>
        TASTE DNA
      </RText>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dnaChips}>
        {cuisines.map(c => (
          <View key={c} style={[styles.dnaChip, styles.dnaChipCuisine]}>
            <RText variant="labelSmall" color={colors.primary} style={{ fontWeight: '700' }}>
              {CUISINE_LABELS[c] ?? c}
            </RText>
          </View>
        ))}
        {dietary.map(d => (
          <View key={d} style={[styles.dnaChip, styles.dnaChipDietary]}>
            <RText variant="labelSmall" color={colors.success} style={{ fontWeight: '700' }}>
              {DIETARY_LABELS[d] ?? d}
            </RText>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function VisitedTab({ restaurants, dishes }: { restaurants: any[]; dishes: any[] }) {
  if (restaurants.length === 0 && dishes.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <RText style={{ fontSize: 32 }}>📍</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>Nothing saved yet</RText>
        <Caption color={colors.textSecondary}>Save restaurants and dishes to revisit them</Caption>
      </View>
    );
  }

  return (
    <View style={{ paddingTop: spacing[2] }}>
      {restaurants.length > 0 && (
        <View style={{ marginBottom: spacing[4] }}>
          <RText variant="labelMedium" color={colors.textTertiary} style={styles.visitedSectionLabel}>
            SAVED RESTAURANTS
          </RText>
          {restaurants.map(r => (
            <View key={r.id} style={{ paddingHorizontal: spacing[4], marginBottom: spacing[3] }}>
              <RestaurantCard restaurant={r} />
            </View>
          ))}
        </View>
      )}

      {dishes.length > 0 && (
        <View>
          <RText variant="labelMedium" color={colors.textTertiary} style={styles.visitedSectionLabel}>
            SAVED DISHES
          </RText>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dishesRow}
          >
            {dishes.map(d => (
              <DishChip key={d.id} dish={d} />
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

function ListsTab({ lists }: { lists: List[] }) {
  if (lists.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <RText style={{ fontSize: 32 }}>📋</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No lists yet</RText>
        <Caption color={colors.textSecondary}>Create lists to curate your favourite spots</Caption>
      </View>
    );
  }

  return (
    <View style={styles.listsGrid}>
      {lists.map(list => (
        <TouchableOpacity
          key={list.id}
          style={styles.listCard}
          onPress={() => router.push(`/list/${list.id}`)}
          activeOpacity={0.85}
        >
          {list.cover_url ? (
            <Image source={{ uri: list.cover_url }} style={styles.listCover} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={[colors.primary, colors.accent]}
              style={styles.listCover}
            />
          )}
          <View style={styles.listCardBody}>
            <RText variant="titleSmall" numberOfLines={2}>{list.name}</RText>
            <Caption color={colors.textTertiary} style={{ marginTop: spacing[1] }}>
              {list.is_public ? '🌐 Public' : '🔒 Private'}
            </Caption>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const CARD_SIZE = (SCREEN_WIDTH - spacing[4] * 2 - spacing[3]) / 2;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  coverContainer: { height: 160, position: 'relative' },
  cover: { width: '100%', height: '100%' },
  profileSection: { paddingHorizontal: spacing[4] },
  avatarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: -40,
    marginBottom: spacing[3],
  },
  avatarContainer: {
    borderRadius: 44,
    borderWidth: 3,
    borderColor: colors.white,
    overflow: 'hidden',
  },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing[3] },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsBtn: { padding: spacing[2] },
  nameSection: { gap: spacing[1], marginBottom: spacing[4] },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  tasteProfileBadge: {
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
  stats: {
    flexDirection: 'row',
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
  },
  statItem: { flex: 1, alignItems: 'center', gap: spacing[0.5] },
  statDivider: { width: 1, backgroundColor: colors.border },
  badgesRow: {
    gap: spacing[2],
    paddingBottom: spacing[4],
  },
  badgeItem: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeMore: { backgroundColor: colors.gray200 },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: 2,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabActive: { borderBottomColor: colors.primary },
  tabContent: { paddingTop: spacing[2] },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: spacing[16],
    gap: spacing[2],
  },
  reviewsList: { paddingHorizontal: spacing[4] },
  reviewItem: {
    flexDirection: 'row',
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  reviewPhoto: {
    width: 72,
    height: 72,
    borderRadius: radius.xl,
  },
  reviewInfo: { flex: 1, gap: spacing[1] },
  reviewRatingRow: { flexDirection: 'row', alignItems: 'center' },
  passport: { paddingHorizontal: spacing[4], paddingTop: spacing[4] },
  passportStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  passportStat: {
    width: (SCREEN_WIDTH - spacing[4] * 2 - spacing[3] * 2) / 3,
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[0.5],
  },
  // Taste DNA
  tasteDNA: {
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  tasteDNALabel: {
    letterSpacing: 0.8,
    marginBottom: spacing[2],
  },
  dnaChips: {
    gap: spacing[2],
    paddingBottom: spacing[1],
  },
  dnaChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },
  dnaChipCuisine: {
    backgroundColor: colors.primarySurface,
  },
  dnaChipDietary: {
    backgroundColor: colors.successLight,
  },

  // Visited tab
  visitedSectionLabel: {
    letterSpacing: 0.8,
    marginBottom: spacing[3],
    paddingHorizontal: spacing[4],
  },
  dishesRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },

  // Lists tab
  listsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: spacing[4],
    gap: spacing[3],
  },
  listCard: {
    width: CARD_SIZE,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    ...(shadows.xs as object),
  },
  listCover: {
    width: '100%',
    height: 100,
  },
  listCardBody: {
    padding: spacing[3],
  },

  badgesSection: {},
  badgesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  badgeCard: {
    width: CARD_SIZE,
    alignItems: 'center',
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[2],
  },
});
