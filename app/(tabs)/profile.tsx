import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from 'react-native';
import { useScrollToTop } from '@react-navigation/native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { getProfileTheme } from '@/theme/profileThemes';
import { RText, Caption, H2, Body } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { getUserBadges, getUserPassport, getUserReviews, getUserLists, getTasteMatches } from '@/services/users';
import { getSavedRestaurants } from '@/services/restaurants';
import { getUserSavedDishes } from '@/services/dishes';
import { getUserCoins } from '@/services/coins';
import { useFeatureAccess, unlockWithCoins, FEATURES, type FeatureDef } from '@/services/features';
import { getReferralStats } from '@/services/referrals';
import { shareInvite } from '@/lib/referral';
import { FeatureGateModal } from '@/components/ui/FeatureGateModal';
import { toast } from '@/stores/toastStore';
import { useUserLocation } from '@/hooks/useUserLocation';
import { distanceKm, formatDistance, type Coords } from '@/lib/geo';
import { queryKeys } from '@/lib/queryClient';
import { TASTE_PROFILE_LABELS, CUISINE_LABELS, DIETARY_LABELS, CATEGORY_LABELS } from '@/types';
import type { Review, Badge, List } from '@/types';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { DishChip } from '@/components/dishes/DishCard';
import { TasteMatchCard } from '@/components/users/TasteMatchBadge';
import { ScoreBadge, ReviewCard } from '@/components/profile/ReviewCard';
import { SavedRestaurantCard } from '@/components/profile/SavedRestaurantCard';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type TabKey = 'reviews' | 'rankings' | 'saved' | 'lists' | 'passport';

export default function ProfileScreen() {
  const { profile, signOut } = useAuthStore();
  const qc = useQueryClient();
  const location = useUserLocation();
  const scrollRef = useRef<ScrollView>(null);
  // Re-pressing the Profile tab while it's focused scrolls back to the top.
  useScrollToTop(scrollRef);

  // On focus, refresh the canonical currentUser resource (mirrored into the auth
  // store by useCurrentUserSync) plus this user's sub-resources. Catches changes
  // made elsewhere — follows, edits, reviews — without per-mutation wiring.
  useFocusEffect(
    useCallback(() => {
      // Returning to the Profile tab resets it to the top.
      scrollRef.current?.scrollTo({ y: 0, animated: false });
      const uid = useAuthStore.getState().profile?.id;
      if (!uid) return;
      qc.invalidateQueries({ queryKey: queryKeys.currentUser() });
      qc.invalidateQueries({ queryKey: ['user', uid] });
      qc.invalidateQueries({ queryKey: ['userCoins', uid] });
    }, [qc])
  );

  const [showSettings, setShowSettings] = useState(false);
  const { isUnlocked, referralCount } = useFeatureAccess();
  const [gate, setGate] = useState<FeatureDef | null>(null);

  const { data: referralStats } = useQuery({
    queryKey: ['referralStats', profile?.id],
    queryFn: () => getReferralStats(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 60,
  });

  const handleInvite = () => {
    if (profile?.username) shareInvite(profile.username);
  };

  const openFeature = (featureId: string) => {
    setShowSettings(false);
    // Monthly Recap is free & shareable (it's the growth loop) — never gate it.
    if (featureId === 'monthly_recap') { router.push('/recap'); return; }
    const feature = FEATURES[featureId];
    if (isUnlocked(featureId)) {
      if (featureId === 'taste_analytics') router.push('/taste-analytics');
      else toast.info(`${feature.name} — coming soon!`);
    } else {
      setGate(feature);
    }
  };

  const handleUnlockWithCoins = async (feature: FeatureDef) => {
    const uid = useAuthStore.getState().profile?.id;
    if (!uid) return;
    const result = await unlockWithCoins(uid, feature);
    if (result.success) {
      qc.invalidateQueries({ queryKey: ['featureUnlocks', uid] });
      qc.invalidateQueries({ queryKey: ['userCoins', uid] });
      toast.success(result.message);
      setGate(null);
    } else {
      toast.error(result.message);
    }
  };
  const handleSignOut = async () => {
    setShowSettings(false);
    await signOut();
    router.replace('/(auth)/welcome');
  };
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
    enabled: !!profile && (activeTab === 'reviews' || activeTab === 'rankings'),
  });

  const { data: savedRestaurants } = useQuery({
    queryKey: queryKeys.savedRestaurants(profile?.id ?? ''),
    queryFn: () => getSavedRestaurants(profile!.id),
    enabled: !!profile && activeTab === 'saved',
  });

  const { data: savedDishes } = useQuery({
    queryKey: queryKeys.savedDishes(profile?.id ?? ''),
    queryFn: () => getUserSavedDishes(profile!.id),
    enabled: !!profile && activeTab === 'saved',
  });

  const { data: userLists } = useQuery({
    queryKey: queryKeys.userLists(profile?.id ?? ''),
    queryFn: () => getUserLists(profile!.id),
    enabled: !!profile && activeTab === 'lists',
  });

  const { data: tasteMatches } = useQuery({
    queryKey: queryKeys.userTasteMatches(profile?.id ?? ''),
    queryFn: () => getTasteMatches(profile!.id, 5),
    enabled: !!profile,
    staleTime: 1000 * 60 * 10,
  });

  // Keep ALL hooks above the early return — otherwise signing out (profile → null)
  // drops a hook and crashes with "rendered fewer hooks than expected".
  const { data: userCoins = 0 } = useQuery({
    queryKey: ['userCoins', profile?.id],
    queryFn: () => getUserCoins(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 30,
  });

  if (!profile) return null;

  const tasteProfile = profile.taste_profile
    ? TASTE_PROFILE_LABELS[profile.taste_profile]
    : null;

  const theme = getProfileTheme(profile.active_theme as string | undefined);

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'reviews', label: 'Reviews', count: profile.total_reviews },
    { key: 'rankings', label: 'Rankings', count: profile.total_reviews },
    { key: 'saved', label: 'Saved', count: savedRestaurants?.length ?? 0 },
    { key: 'lists', label: 'Lists', count: profile.total_lists },
    { key: 'passport', label: 'Passport', count: 0 },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* Cover + Header */}
        <View style={styles.coverContainer}>
          {profile.cover_url ? (
            <Image source={{ uri: profile.cover_url }} style={styles.cover} contentFit="cover" />
          ) : (
            <LinearGradient
              colors={theme.headerGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
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
                borderColor={theme.accent}
              />
            </View>
            <View style={styles.headerActions}>
              {/* Coins pill — the single home for coins; tap to open the shop */}
              <TouchableOpacity
                style={[styles.coinsPill, { borderColor: theme.accent }]}
                onPress={() => router.push('/shop')}
                activeOpacity={0.85}
              >
                <RText style={{ fontSize: 15, lineHeight: 20 }}>🪙</RText>
                <RText variant="labelMedium" color={colors.accentDark} style={{ marginLeft: 4 }}>
                  {userCoins.toLocaleString()}
                </RText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.editBtn}
                onPress={() => router.push('/edit-profile')}
              >
                <Ionicons name="pencil" size={16} color={colors.textPrimary} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.settingsBtn} onPress={() => setShowSettings(true)}>
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

          {/* Weekly streak card */}
          <StreakCard weeks={passport?.streak_days ?? 0} />

          {/* Monthly recap entry */}
          <RecapCard />


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

        {/* Taste matches */}
        {(tasteMatches ?? []).length > 0 && (
          <View style={styles.matchesSection}>
            <View style={styles.matchesHeader}>
              <RText variant="labelMedium" color={colors.textTertiary} style={{ letterSpacing: 0.8 }}>
                PEOPLE LIKE YOU
              </RText>
              <TouchableOpacity onPress={() => router.push('/taste-match')}>
                <Caption color={colors.primary}>See all →</Caption>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.matchesRow}
            >
              {(tasteMatches ?? []).map(match => (
                <View key={match.user.id} style={styles.matchCardWrapper}>
                  <TasteMatchCard
                    match={match}
                    currentUserName={profile.display_name}
                    onPress={() => router.push(`/user/${match.user.username}`)}
                  />
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tab, activeTab === tab.key && { borderBottomColor: theme.accent }]}
              onPress={() => setActiveTab(tab.key)}
            >
              <RText
                variant="labelMedium"
                color={activeTab === tab.key ? theme.accent : colors.textSecondary}
              >
                {tab.label}
              </RText>
              {tab.count > 0 && (
                <Caption color={activeTab === tab.key ? theme.accent : colors.textTertiary}>
                  {tab.count}
                </Caption>
              )}
            </TouchableOpacity>
          ))}
        </View>

        {/* Taste DNA — shown on reviews tab */}
        {activeTab === 'reviews' &&
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
          {activeTab === 'rankings' && (
            <RankingsTab reviews={reviews ?? []} userId={profile.id} location={location} />
          )}
          {activeTab === 'saved' && (
            <SavedTab
              restaurants={savedRestaurants ?? []}
              dishes={savedDishes ?? []}
              location={location}
            />
          )}
          {activeTab === 'lists' && <ListsTab />}
          {activeTab === 'passport' && (
            <PassportView
              passport={passport}
              badges={badges ?? []}
              coins={userCoins}
            />
          )}
        </View>
      </ScrollView>

      {/* Settings menu */}
      <Modal
        visible={showSettings}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSettings(false)}
      >
        <TouchableOpacity style={styles.settingsOverlay} activeOpacity={1} onPress={() => setShowSettings(false)}>
          <View style={styles.settingsSheet}>
            <View style={styles.settingsHandle} />
            <SettingsItem
              icon="pencil-outline"
              label="Edit Profile"
              onPress={() => { setShowSettings(false); router.push('/edit-profile'); }}
            />
            <SettingsItem
              icon="gift-outline"
              label="Invite Friends"
              sublabel={
                (referralStats?.activated ?? 0) > 0
                  ? `${referralStats?.activated} joined & reviewed · +200 🪙 each`
                  : 'Earn 🪙 and unlock features — refer a friend'
              }
              onPress={() => { setShowSettings(false); handleInvite(); }}
            />
            <SettingsItem
              icon="stats-chart-outline"
              label="Taste Analytics"
              sublabel={isUnlocked('taste_analytics') ? 'Unlocked' : 'Refer 3 friends'}
              onPress={() => openFeature('taste_analytics')}
            />
            <SettingsItem
              icon="log-out-outline"
              label="Sign Out"
              destructive
              onPress={handleSignOut}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <FeatureGateModal
        feature={gate}
        referralCount={referralCount}
        coins={userCoins}
        onClose={() => setGate(null)}
        onUnlockWithCoins={handleUnlockWithCoins}
        onInvite={() => { setGate(null); handleInvite(); }}
      />
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
        <RText style={{ fontSize: 32, lineHeight: 42 }}>✍️</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No reviews yet</RText>
        <Caption color={colors.textSecondary}>Rate restaurants to build your profile</Caption>
      </View>
    );
  }

  return (
    <View style={styles.reviewsList}>
      {reviews.map(review => (
        <ReviewCard key={review.id} review={review} />
      ))}
    </View>
  );
}

function PassportView({
  passport, badges, coins,
}: {
  passport: any;
  badges: Badge[];
  coins: number;
}) {
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
      {/* Passport stats */}
      <View style={styles.passportStats}>
        {stats.map(s => (
          <View key={s.label} style={styles.passportStat}>
            <RText style={{ fontSize: 24 }}>{s.icon}</RText>
            <RText variant="stat" style={{ marginTop: spacing[1] }}>{s.value}</RText>
            <Caption>{s.label}</Caption>
          </View>
        ))}
      </View>

      {/* Badges */}
      <View style={styles.badgesSection}>
        <RText variant="h4" style={{ marginBottom: spacing[4] }}>Badges</RText>
        {badges.length === 0 ? (
          <View style={styles.emptyTab}>
            <RText style={{ fontSize: 32, lineHeight: 42 }}>🏅</RText>
            <Caption>Visit more restaurants to earn badges</Caption>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {badges.map(badge => (
              <View key={badge.id} style={styles.badgeCard}>
                <RText style={{ fontSize: 32, lineHeight: 42 }}>{badge.icon_emoji ?? '🏅'}</RText>
                <RText variant="titleSmall" align="center" numberOfLines={2}>{badge.name}</RText>
                <Caption align="center" numberOfLines={2}>{badge.description}</Caption>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
}

// Weekly streak card — prominent, always visible, motivating.
function StreakCard({ weeks }: { weeks: number }) {
  const active = weeks > 0;
  const nextMilestone = Math.ceil((weeks + (active ? 0.0001 : 1)) / 5) * 5;
  const progress = active ? (weeks % 5 === 0 ? 1 : (weeks % 5) / 5) : 0;

  return (
    <LinearGradient
      colors={active ? ['#FF7A45', '#D94841'] : [colors.gray100, colors.gray200]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.streakCard}
    >
      <View style={styles.streakLeft}>
        <RText style={{ fontSize: 34, lineHeight: 42 }}>{active ? '🔥' : '🌱'}</RText>
      </View>
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <RText style={[styles.streakNum, { color: active ? colors.white : colors.textPrimary }]}>
            {weeks}
          </RText>
          <RText variant="titleSmall" color={active ? colors.whiteTransparent90 : colors.textSecondary} style={{ marginLeft: 6 }}>
            {weeks === 1 ? 'week streak' : 'week streak'}
          </RText>
        </View>
        <Caption color={active ? colors.whiteTransparent90 : colors.textSecondary} style={{ marginTop: 2 }}>
          {active
            ? `${nextMilestone - weeks} more ${nextMilestone - weeks === 1 ? 'week' : 'weeks'} to a +100 🪙 bonus`
            : 'Rate a place weekly to start your streak'}
        </Caption>
        {/* Progress to next milestone */}
        <View style={[styles.streakTrack, { backgroundColor: active ? 'rgba(255,255,255,0.3)' : colors.gray300 }]}>
          <View style={[styles.streakFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: active ? colors.white : colors.gray400 }]} />
        </View>
      </View>
    </LinearGradient>
  );
}

// Monthly recap entry point on the profile.
function RecapCard() {
  const month = new Date().toLocaleString('en-US', { month: 'long' });
  return (
    <TouchableOpacity activeOpacity={0.9} onPress={() => router.push('/recap')} style={{ marginBottom: spacing[4] }}>
      <LinearGradient
        colors={['#6D28D9', '#BE185D']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.recapCard}
      >
        <View style={styles.recapIcon}>
          <RText style={{ fontSize: 22, lineHeight: 28 }}>✨</RText>
        </View>
        <View style={{ flex: 1 }}>
          <RText variant="titleMedium" color={colors.white}>Your {month} Recap</RText>
          <Caption color={colors.whiteTransparent90}>Tap to view & share your food story</Caption>
        </View>
        <Ionicons name="chevron-forward" size={20} color={colors.white} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

function SettingsItem({
  icon, label, sublabel, onPress, destructive,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  sublabel?: string;
  onPress: () => void;
  destructive?: boolean;
}) {
  return (
    <TouchableOpacity style={styles.settingsItem} onPress={onPress} activeOpacity={0.7}>
      <View style={[styles.settingsIcon, destructive && { backgroundColor: colors.errorLight }]}>
        <Ionicons name={icon} size={20} color={destructive ? colors.error : colors.textPrimary} />
      </View>
      <View style={{ flex: 1 }}>
        <RText variant="titleSmall" color={destructive ? colors.error : colors.textPrimary}>{label}</RText>
        {sublabel && <Caption color={colors.textTertiary}>{sublabel}</Caption>}
      </View>
      {!destructive && <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />}
    </TouchableOpacity>
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

const CATEGORY_FILTERS = [
  { label: 'All', value: 'all' },
  { label: '🍜 Hawker & Mamak', value: 'hawker_mamak' },
  { label: '☕ Cafe & Kopitiam', value: 'cafe_kopitiam' },
  { label: '🍽️ Restaurants', value: 'dining' },
  { label: '🌙 Night Markets', value: 'street' },
];

const FILTER_MAP: Record<string, string[]> = {
  all: [],
  hawker_mamak: ['hawker', 'mamak', 'food_court'],
  cafe_kopitiam: ['cafe', 'kopitiam'],
  dining: ['restaurant', 'fine_dining', 'fast_food', 'bar'],
  street: ['night_market'],
};

type LocationHook = ReturnType<typeof useUserLocation>;
type SortMode = 'score' | 'distance';

// Shared Score ⇄ Distance toggle. Tapping "Distance" lazily requests location;
// if denied we fall back to score and tell the user.
function useSortMode(location: LocationHook) {
  const [mode, setMode] = useState<SortMode>('score');
  const chooseScore = () => setMode('score');
  const chooseDistance = async () => {
    const coords = await location.request();
    if (coords) setMode('distance');
    else { setMode('score'); toast.info('Enable location access to sort by distance.'); }
  };
  return { mode, chooseScore, chooseDistance, coords: location.coords };
}

function SortChips({ mode, onScore, onDistance }: {
  mode: SortMode; onScore: () => void; onDistance: () => void;
}) {
  return (
    <View style={styles.sortRow}>
      <TouchableOpacity
        style={[styles.sortChip, mode === 'score' && styles.sortChipActive]}
        onPress={onScore}
        activeOpacity={0.8}
      >
        <Ionicons name="star" size={12} color={mode === 'score' ? colors.white : colors.textSecondary} />
        <RText variant="labelSmall" color={mode === 'score' ? colors.white : colors.textSecondary} style={{ marginLeft: 4 }}>
          Score
        </RText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.sortChip, mode === 'distance' && styles.sortChipActive]}
        onPress={onDistance}
        activeOpacity={0.8}
      >
        <Ionicons name="navigate" size={12} color={mode === 'distance' ? colors.white : colors.textSecondary} />
        <RText variant="labelSmall" color={mode === 'distance' ? colors.white : colors.textSecondary} style={{ marginLeft: 4 }}>
          Distance
        </RText>
      </TouchableOpacity>
    </View>
  );
}

/** Sort by distance from `coords`; entries missing coordinates sink to the end. */
function byDistance<T>(items: T[], coords: Coords, getLL: (t: T) => { lat?: number | null; lng?: number | null }) {
  return [...items].sort((a, b) => {
    const la = getLL(a); const lb = getLL(b);
    const da = la.lat != null && la.lng != null ? distanceKm(coords, { lat: la.lat, lng: la.lng }) : Infinity;
    const db = lb.lat != null && lb.lng != null ? distanceKm(coords, { lat: lb.lat, lng: lb.lng }) : Infinity;
    return da - db;
  });
}

function RankingsTab({ reviews, userId, location }: { reviews: Review[]; userId: string; location: LocationHook }) {
  const [filter, setFilter] = useState('all');
  const { mode, chooseScore, chooseDistance, coords } = useSortMode(location);

  const filtered = reviews.filter(r => {
    if (filter === 'all') return true;
    const cats = FILTER_MAP[filter] ?? [];
    return cats.includes((r as any).restaurant?.category ?? '');
  });

  // Rank position is always by score (Beli-style), even when sorted by distance.
  const rankOf = new Map(
    [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).map((r, i) => [r.id, i + 1]),
  );

  const sorted =
    mode === 'distance' && coords
      ? byDistance(filtered, coords, r => ({ lat: r.restaurant?.latitude, lng: r.restaurant?.longitude }))
      : [...filtered].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));

  return (
    <View style={{ paddingTop: spacing[2] }}>
      {/* Filter chips — always visible */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {CATEGORY_FILTERS.map(f => (
          <TouchableOpacity
            key={f.value}
            style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
            onPress={() => setFilter(f.value)}
          >
            <RText variant="labelSmall" color={filter === f.value ? colors.white : colors.textSecondary}
              style={{ fontWeight: filter === f.value ? '700' : '400' }}>
              {f.label}
            </RText>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Sort control */}
      <View style={styles.sortBar}>
        <SortChips mode={mode} onScore={chooseScore} onDistance={chooseDistance} />
      </View>

      {/* Empty state or ranked list */}
      {sorted.length === 0 ? (
        <View style={styles.emptyTab}>
          <RText style={{ fontSize: 32, lineHeight: 42 }}>🏆</RText>
          <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>
            {filter === 'all' ? 'No rankings yet' : 'Nothing here yet'}
          </RText>
          <Caption color={colors.textSecondary}>
            {filter === 'all' ? 'Rate restaurants to build your personal rankings' : 'Try a different category'}
          </Caption>
        </View>
      ) : sorted.map((review) => {
        const r = review.restaurant as any;
        const dist = formatDistance(coords, r?.latitude, r?.longitude);
        const meta = [
          r?.category ? (CATEGORY_LABELS[r.category as keyof typeof CATEGORY_LABELS] ?? r.category) : null,
          r?.area ?? r?.city,
          dist,
        ].filter(Boolean).join(' · ');

        return (
          <TouchableOpacity
            key={review.id}
            style={styles.rankRow}
            onPress={() => router.push(`/restaurant/${review.restaurant_id}` as any)}
            activeOpacity={0.85}
          >
            <ScoreBadge rating={review.rating} size={48} />
            <View style={styles.rankInfo}>
              <View style={styles.rankNameRow}>
                <RText variant="titleLarge" numberOfLines={1} style={{ flex: 1 }}>
                  {r?.name ?? 'Restaurant'}
                </RText>
                <RText style={styles.rankPos}>#{rankOf.get(review.id) ?? '—'}</RText>
              </View>
              {meta ? (
                <Caption color={colors.textTertiary} numberOfLines={1} style={{ marginTop: 2 }}>{meta}</Caption>
              ) : null}
            </View>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function SavedTab({ restaurants, dishes, location }: { restaurants: any[]; dishes: any[]; location: LocationHook }) {
  const { mode, chooseScore, chooseDistance, coords } = useSortMode(location);

  if (restaurants.length === 0 && dishes.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <RText style={{ fontSize: 32, lineHeight: 42 }}>🔖</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No saves yet</RText>
        <Caption color={colors.textSecondary}>Bookmark restaurants you want to try</Caption>
      </View>
    );
  }

  const sortedRestaurants =
    mode === 'distance' && coords
      ? byDistance(restaurants, coords, r => ({ lat: r.latitude, lng: r.longitude }))
      : [...restaurants].sort((a, b) => (b.overall_rating ?? 0) - (a.overall_rating ?? 0));

  return (
    <View style={{ paddingTop: spacing[2] }}>
      {restaurants.length > 0 && (
        <View style={{ marginBottom: spacing[4] }}>
          <View style={styles.savedHeaderRow}>
            <RText variant="labelMedium" color={colors.textTertiary} style={styles.visitedSectionLabel}>
              WANT TO TRY · {restaurants.length}
            </RText>
            <SortChips mode={mode} onScore={chooseScore} onDistance={chooseDistance} />
          </View>
          <View style={styles.savedList}>
            {sortedRestaurants.map(r => (
              <SavedRestaurantCard
                key={r.id}
                restaurant={r}
                distance={mode === 'distance' ? formatDistance(coords, r.latitude, r.longitude) : null}
              />
            ))}
          </View>
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

// Lists are not shipped yet — surfaced as a "coming soon" teaser so users know
// what Custom Lists will be.
function ListsTab() {
  return (
    <View style={styles.comingSoon}>
      <LinearGradient
        colors={[colors.primary, colors.accent]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.comingSoonIcon}
      >
        <Ionicons name="list" size={30} color={colors.white} />
      </LinearGradient>
      <View style={styles.comingSoonBadge}>
        <RText variant="labelSmall" color={colors.primary} style={{ letterSpacing: 1 }}>COMING SOON</RText>
      </View>
      <RText variant="titleLarge" style={{ marginTop: spacing[3] }}>Custom Lists</RText>
      <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 300, lineHeight: 20 }}>
        Curate and share your own themed collections — “Best Nasi Lemak in KL”, “Date Night Spots”,
        weekend food trips. Save places into lists and share them with friends.
      </Caption>
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
    padding: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
  },
  settingsBtn: { padding: spacing[2] },
  coinsPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSurface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.accentLight,
  },
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
  // Streak card
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    gap: spacing[3],
  },
  streakLeft: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakNum: { fontSize: 30, lineHeight: 36, fontWeight: '800' },
  // Recap entry card
  recapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[3],
  },
  recapIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakTrack: {
    height: 6,
    borderRadius: 3,
    marginTop: spacing[2],
    overflow: 'hidden',
  },
  streakFill: { height: 6, borderRadius: 3 },

  // Settings menu
  settingsOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  settingsSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    padding: spacing[4],
    paddingBottom: spacing[10],
    gap: spacing[1],
  },
  settingsHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray300,
    alignSelf: 'center',
    marginBottom: spacing[4],
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    gap: spacing[3],
  },
  settingsIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.lg,
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopCta: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentDark,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
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
  reviewsList: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[3] },
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
  // Taste matches
  matchesSection: {
    paddingTop: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  matchesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  matchesRow: {
    paddingHorizontal: spacing[4],
    gap: spacing[3],
    paddingBottom: spacing[4],
  },
  matchCardWrapper: {
    width: 260,
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
  filterRow: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
  },
  filterChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  rankRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 76,
    paddingHorizontal: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rankInfo: { flex: 1, marginLeft: spacing[3], justifyContent: 'center' },
  rankNameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  rankPos: { fontSize: 13, fontWeight: '800', color: colors.textTertiary },

  // Sort control
  sortBar: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    alignItems: 'flex-start',
  },
  sortRow: {
    flexDirection: 'row',
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    padding: 2,
  },
  sortChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1] + 1,
    borderRadius: radius.full,
  },
  sortChipActive: { backgroundColor: colors.textPrimary },

  savedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: spacing[4],
  },
  savedList: { paddingHorizontal: spacing[4], gap: spacing[3] },
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

  // Lists tab — coming soon
  comingSoon: {
    alignItems: 'center',
    paddingTop: spacing[12],
    paddingBottom: spacing[16],
    paddingHorizontal: spacing[8],
  },
  comingSoonIcon: {
    width: 68,
    height: 68,
    borderRadius: radius['2xl'],
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.md as object),
  },
  comingSoonBadge: {
    marginTop: spacing[4],
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
  },

  badgesSection: { marginBottom: spacing[6] },
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

  // Coin banner
  coinBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[6],
  },
  coinBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Shop — theme grid
  shopSection: { marginBottom: spacing[8] },
  shopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  themesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  themeCard: {
    width: (SCREEN_WIDTH - spacing[4] * 2 - spacing[3]) / 2,
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[3],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 2,
    borderColor: 'transparent',
  },
  themeCardActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  themeSwatch: {
    width: '100%',
    height: 72,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  themeSwatchBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 6,
  },
  activeChip: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
});
