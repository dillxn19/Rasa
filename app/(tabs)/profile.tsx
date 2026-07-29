import React, { useState, useCallback, useRef, useEffect } from 'react';
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
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router, useFocusEffect } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { getProfileTheme } from '@/theme/profileThemes';
import { RText, Caption, H2, Body } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { getUserBadges, getUserPassport, getUserReviews, getUserLists, getTasteMatches, repairStreak, streakRepairCost, isStreakBroken } from '@/services/users';
import { getSavedRestaurants, deleteReview } from '@/services/restaurants';
import { getUserSavedDishes } from '@/services/dishes';
import { getUserCoins } from '@/services/coins';
import { getRecapWindow } from '@/services/recap';
import { useFeatureAccess, unlockWithCoins, unlockWithReferral, FEATURES, type FeatureDef } from '@/services/features';
import { getReferralStats } from '@/services/referrals';
import { shareInvite, copyReferralCode } from '@/lib/referral';
import { track } from '@/lib/analytics';
import { FeatureGateModal } from '@/components/ui/FeatureGateModal';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { deleteAccount } from '@/services/account';
import { toast } from '@/stores/toastStore';
import { useUserLocation } from '@/hooks/useUserLocation';
import { distanceKm, formatDistance, type Coords } from '@/lib/geo';
import { queryKeys } from '@/lib/queryClient';
import { TASTE_PROFILE_LABELS, CUISINE_LABELS, DIETARY_LABELS, CATEGORY_LABELS } from '@/types';
import type { Review, Badge, List } from '@/types';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { DishChip } from '@/components/dishes/DishCard';
import { TasteMatchCard } from '@/components/users/TasteMatchBadge';
import { ScoreBadge } from '@/components/profile/ReviewCard';
import { ReviewPostCard, type ReviewPost } from '@/components/reviews/ReviewPostCard';
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
  const { isUnlocked, referralCredits } = useFeatureAccess();
  const [gate, setGate] = useState<FeatureDef | null>(null);

  const { data: referralStats } = useQuery({
    queryKey: ['referralStats', profile?.id],
    queryFn: () => getReferralStats(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 60,
  });

  // Prefer the stable referral code; fall back to username for old links.
  const inviteRef = profile?.referral_code ?? profile?.username;
  const handleInvite = () => {
    if (!inviteRef) return;
    // Close the sheet first; shareInvite defers the OS share sheet until after
    // the modal dismissal settles (presenting over a dismissing modal crashes iOS).
    setShowSettings(false);
    shareInvite(inviteRef);
    track('referral_shared');
  };
  const handleCopyCode = async () => {
    if (!profile?.referral_code) return;
    await copyReferralCode(profile.referral_code);
    track('referral_code_copied');
    toast.success('Referral code copied');
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

  const handleUnlockWithReferral = async (feature: FeatureDef) => {
    const uid = useAuthStore.getState().profile?.id;
    if (!uid) return;
    const result = await unlockWithReferral(uid, feature);
    if (result.success) {
      qc.invalidateQueries({ queryKey: ['featureUnlocks', uid] });
      qc.invalidateQueries({ queryKey: ['referralUnlockCount', uid] });
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

  const [showPassport, setShowPassport] = useState(false);
  const [showRepairConfirm, setShowRepairConfirm] = useState(false);
  const [repairing, setRepairing] = useState(false);

  const handleRepairStreak = async () => {
    if (!profile) return;
    setRepairing(true);
    const result = await repairStreak(profile.id);
    setRepairing(false);
    setShowRepairConfirm(false);
    if (result.success) {
      qc.invalidateQueries({ queryKey: queryKeys.userPassport(profile.id) });
      qc.invalidateQueries({ queryKey: ['userCoins', profile.id] });
      toast.success(result.message);
    } else {
      toast.error(result.message);
    }
  };

  // Google account linking — lets users who signed up with email add Google
  // sign-in later. Check current identities when the settings sheet opens.
  const [googleLinked, setGoogleLinked] = useState(false);
  useEffect(() => {
    if (!showSettings) return;
    supabase.auth.getUserIdentities()
      .then(({ data }) => setGoogleLinked(!!data?.identities?.some(i => i.provider === 'google')))
      .catch(() => {});
  }, [showSettings]);

  const handleLinkGoogle = async () => {
    if (googleLinked) return;
    try {
      const { error } = await supabase.auth.linkIdentity({ provider: 'google' });
      if (error) throw error;
      // OAuth opens in the browser; on return the identity is linked.
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not connect Google. Try again.');
    }
  };
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState<string | null>(null);
  const deleteReviewMutation = useMutation({
    mutationFn: (rid: string) => deleteReview(rid),
    onSuccess: () => {
      setReviewToDelete(null);
      if (profile) {
        qc.invalidateQueries({ queryKey: queryKeys.userReviews(profile.id) });
        qc.invalidateQueries({ queryKey: queryKeys.currentUser() });
        qc.invalidateQueries({ queryKey: queryKeys.userPassport(profile.id) });
      }
      toast.success('Review deleted');
    },
    onError: () => toast.error('Could not delete the review.'),
  });
  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      track('account_deleted');
      await signOut();
      setShowDeleteConfirm(false);
      setDeleting(false);
      router.replace('/(auth)/welcome');
    } catch {
      setDeleting(false);
      toast.error('Could not delete account. Please try again.');
    }
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

  // Load saved upfront (not just when the Saved tab is active) so the tab count
  // is correct on first render and the tab loads instantly.
  const { data: savedRestaurants } = useQuery({
    queryKey: queryKeys.savedRestaurants(profile?.id ?? ''),
    queryFn: () => getSavedRestaurants(profile!.id),
    enabled: !!profile,
  });

  const { data: savedDishes } = useQuery({
    queryKey: queryKeys.savedDishes(profile?.id ?? ''),
    queryFn: () => getUserSavedDishes(profile!.id),
    enabled: !!profile,
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

  const streakWeeks = passport?.streak_days ?? 0;
  const streakBroken = isStreakBroken(streakWeeks, (passport?.last_activity_date as string | null) ?? null);
  const repairCost = streakRepairCost(streakWeeks);

  const tasteProfile = profile.taste_profile
    ? TASTE_PROFILE_LABELS[profile.taste_profile]
    : null;

  const theme = getProfileTheme(profile.active_theme as string | undefined);

  const TABS: { key: TabKey; label: string; count: number }[] = [
    { key: 'reviews', label: 'Activity', count: profile.total_reviews },
    { key: 'rankings', label: 'Ratings', count: profile.total_reviews },
    { key: 'saved', label: 'Saved', count: savedRestaurants?.length ?? 0 },
    { key: 'lists', label: 'Lists', count: profile.total_lists },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView ref={scrollRef} showsVerticalScrollIndicator={false}>
        {/* index 0 — everything above the tabs (wrapped so the sticky index is stable) */}
        <View>
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
              {profile.school ? (
                <>
                  <Ionicons name="school-outline" size={14} color={colors.textTertiary} style={{ marginLeft: spacing[3] }} />
                  <Caption style={{ marginLeft: 4 }} numberOfLines={1}>{profile.school}</Caption>
                </>
              ) : null}
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

          {/* Passport button (left) + compact streak (right) */}
          <View style={styles.streakRow}>
            <TouchableOpacity
              style={styles.passportBtn}
              onPress={() => {
                // Passport is bundled with Taste Analytics — gated behind the same
                // referral/coins unlock. Show the gate if it isn't unlocked yet.
                if (isUnlocked('taste_analytics')) setShowPassport(true);
                else setGate(FEATURES.taste_analytics);
              }}
              activeOpacity={0.85}
            >
              <RText style={{ fontSize: 24, lineHeight: 30 }}>🎖️</RText>
              <View style={{ flex: 1 }}>
                <RText variant="titleSmall" numberOfLines={1}>Passport</RText>
                <Caption color={colors.textSecondary}>
                  {isUnlocked('taste_analytics') ? `${badges?.length ?? 0} badges` : '🔒 1 referral or 1,000 🪙'}
                </Caption>
              </View>
              <Ionicons
                name={isUnlocked('taste_analytics') ? 'chevron-forward' : 'lock-closed'}
                size={16}
                color={colors.textTertiary}
              />
            </TouchableOpacity>
            <StreakCard weeks={passport?.streak_days ?? 0} compact />
          </View>

          {/* Streak lapsed → offer a coin repair so it isn't lost */}
          {streakBroken && (
            <TouchableOpacity
              style={styles.repairBanner}
              onPress={() => setShowRepairConfirm(true)}
              activeOpacity={0.9}
            >
              <RText style={{ fontSize: 20, lineHeight: 26 }}>💔</RText>
              <View style={{ flex: 1 }}>
                <RText variant="titleSmall" color={colors.textPrimary}>
                  Your {streakWeeks}-week streak lapsed
                </RText>
                <Caption color={colors.textSecondary}>Revive it before it resets</Caption>
              </View>
              <View style={styles.repairCta}>
                <RText variant="labelMedium" color={colors.white}>Repair · {repairCost} 🪙</RText>
              </View>
            </TouchableOpacity>
          )}

          {/* Monthly recap entry — only during the viewing window */}
          {getRecapWindow().open && <RecapCard />}


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

        </View>{/* end index 0 header wrapper */}

        {/* index 1 — sticky tabs */}
        <View style={styles.tabs}>
          {TABS.map(tab => {
            const active = activeTab === tab.key;
            return (
              <TouchableOpacity
                key={tab.key}
                style={[styles.tab, active && { borderBottomColor: theme.accent }]}
                onPress={() => setActiveTab(tab.key)}
                activeOpacity={0.7}
              >
                <RText
                  style={[
                    styles.tabLabel,
                    { color: active ? theme.accent : colors.textPrimary, fontWeight: active ? '800' : '700' },
                  ]}
                >
                  {tab.label}
                </RText>
                <RText style={[styles.tabCountText, { color: active ? theme.accent : colors.textTertiary }]}>
                  {tab.count}
                </RText>
              </TouchableOpacity>
            );
          })}
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
            <ReviewsList
              reviews={reviews ?? []}
              actor={{
                id: profile.id,
                username: profile.username,
                display_name: profile.display_name,
                avatar_url: profile.avatar_url,
              }}
              onDelete={(rid) => setReviewToDelete(rid)}
            />
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
          {activeTab === 'lists' && (
            <ListsTab lists={userLists ?? []} />
          )}
        </View>
      </ScrollView>

      {/* Passport popup (opened from the header button) */}
      <Modal
        visible={showPassport}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPassport(false)}
      >
        <View style={styles.passportOverlay}>
          <View style={styles.passportSheet}>
            <View style={styles.passportSheetHeader}>
              <RText variant="h4">Food Passport</RText>
              <TouchableOpacity onPress={() => setShowPassport(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={colors.textPrimary} />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false}>
              <PassportView passport={passport} badges={badges ?? []} coins={userCoins} />
            </ScrollView>
          </View>
        </View>
      </Modal>

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
            {profile.referral_code && (
              <View style={styles.referCard}>
                <View style={{ flex: 1 }}>
                  <Caption color={colors.textTertiary}>YOUR REFERRAL CODE</Caption>
                  <TouchableOpacity onPress={handleCopyCode} activeOpacity={0.7} style={styles.codeRow}>
                    <RText variant="h3" style={{ letterSpacing: 2 }}>{profile.referral_code}</RText>
                    <Ionicons name="copy-outline" size={18} color={colors.textTertiary} style={{ marginLeft: spacing[2] }} />
                  </TouchableOpacity>
                  {(referralStats?.activated ?? 0) > 0 ? (
                    <Caption color={colors.success}>
                      {referralStats?.activated} joined & reviewed · +200 🪙 each
                    </Caption>
                  ) : (
                    <Caption color={colors.textTertiary}>Share it — you both earn 🪙 when they join.</Caption>
                  )}
                </View>
                <TouchableOpacity
                  style={styles.referBtn}
                  onPress={() => { setShowSettings(false); handleInvite(); }}
                  activeOpacity={0.9}
                >
                  <Ionicons name="share-social" size={16} color={colors.white} />
                  <RText variant="labelMedium" color={colors.white} style={{ marginLeft: 6 }}>Refer</RText>
                </TouchableOpacity>
              </View>
            )}
            {profile.referral_code && (
              <SettingsItem
                icon="people-outline"
                label="Referral Analytics"
                sublabel={
                  (referralStats?.total ?? 0) > 0
                    ? `${referralStats?.total} invited · ${referralStats?.activated ?? 0} activated`
                    : 'Track who joins & activates'
                }
                onPress={() => { setShowSettings(false); router.push('/referrals'); }}
              />
            )}
            <SettingsItem
              icon="stats-chart-outline"
              label="Taste Analytics"
              sublabel={isUnlocked('taste_analytics') ? 'Unlocked' : '1 referral or 1,000 🪙'}
              onPress={() => openFeature('taste_analytics')}
            />
            <SettingsItem
              icon="logo-google"
              label={googleLinked ? 'Google connected' : 'Connect Google account'}
              sublabel={googleLinked ? 'You can sign in with Google' : 'Add Google sign-in to this account'}
              onPress={handleLinkGoogle}
            />
            <SettingsItem
              icon="help-buoy-outline"
              label="Contact Us"
              sublabel="Support, bugs & feedback"
              onPress={() => { setShowSettings(false); router.push('/support'); }}
            />
            <SettingsItem
              icon="shield-checkmark-outline"
              label="Privacy Policy"
              onPress={() => { setShowSettings(false); router.push('/legal/privacy'); }}
            />
            <SettingsItem
              icon="document-text-outline"
              label="Terms of Service"
              onPress={() => { setShowSettings(false); router.push('/legal/terms'); }}
            />
            <SettingsItem
              icon="log-out-outline"
              label="Sign Out"
              destructive
              onPress={handleSignOut}
            />
            <SettingsItem
              icon="trash-outline"
              label="Delete Account"
              destructive
              onPress={() => { setShowSettings(false); setShowDeleteConfirm(true); }}
            />
          </View>
        </TouchableOpacity>
      </Modal>

      <ConfirmDialog
        visible={!!reviewToDelete}
        title="Delete this review?"
        message="Your rating, text and photos for this place will be removed."
        confirmLabel="Delete"
        destructive
        loading={deleteReviewMutation.isPending}
        onConfirm={() => reviewToDelete && deleteReviewMutation.mutate(reviewToDelete)}
        onCancel={() => setReviewToDelete(null)}
      />

      <ConfirmDialog
        visible={showRepairConfirm}
        title={`Repair your ${streakWeeks}-week streak?`}
        message={`Spend ${repairCost} 🪙 to revive it — your next review will continue from week ${streakWeeks} instead of starting over.`}
        confirmLabel={`Repair · ${repairCost} 🪙`}
        loading={repairing}
        onConfirm={handleRepairStreak}
        onCancel={() => setShowRepairConfirm(false)}
      />

      <ConfirmDialog
        visible={showDeleteConfirm}
        title="Delete your account?"
        message="This permanently removes your profile, reviews, photos, followers, coins and everything else. This cannot be undone."
        confirmLabel="Delete forever"
        destructive
        loading={deleting}
        onConfirm={handleDeleteAccount}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      <FeatureGateModal
        feature={gate}
        referralCredits={referralCredits}
        coins={userCoins}
        onClose={() => setGate(null)}
        onUnlockWithCoins={handleUnlockWithCoins}
        onUnlockWithReferral={handleUnlockWithReferral}
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

function ReviewsList({ reviews, actor, onDelete }: {
  reviews: Review[];
  actor: ReviewPost['actor'];
  onDelete?: (id: string) => void;
}) {
  if (reviews.length === 0) {
    return (
      <View style={styles.emptyTab}>
        <RText style={{ fontSize: 32, lineHeight: 42 }}>✍️</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No activity yet</RText>
        <Caption color={colors.textSecondary}>Rate restaurants to build your profile</Caption>
      </View>
    );
  }

  return (
    <View style={styles.feedList}>
      {reviews.map((review, i) => {
        const r = review.restaurant as any;
        const post: ReviewPost = {
          reviewId: review.id,
          rating: review.rating,
          content: review.content,
          photos: (review.photos ?? []) as string[],
          createdAt: review.created_at,
          likeCount: review.like_count ?? 0,
          commentCount: review.comment_count ?? 0,
          isLiked: review.is_liked ?? false,
          restaurant: r
            ? { id: r.id, name: r.name, slug: r.slug ?? null, category: r.category, area: r.area, city: r.city }
            : null,
          actor,
        };
        // Same full-bleed Instagram card as the home feed, minus the redundant
        // per-card actor header (it's obviously this user's own page).
        return (
          <View key={review.id}>
            <ReviewPostCard post={post} variant="feed" showActor={false} onDelete={onDelete} />
            {i < reviews.length - 1 && <View style={styles.feedSeparator} />}
          </View>
        );
      })}
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
    { label: 'Restaurants', value: passport?.restaurants_visited ?? 0, icon: '🍽️', tint: '#FDECEA', num: colors.primary },
    { label: 'Cities', value: passport?.cities_visited?.length ?? 0, icon: '🏙️', tint: '#E9F2FF', num: '#2563EB' },
    { label: 'States', value: passport?.states_visited?.length ?? 0, icon: '🗺️', tint: '#EAF6EE', num: '#3E8E5A' },
    { label: 'Cuisines', value: passport?.cuisines_tried?.length ?? 0, icon: '🌍', tint: '#FFF3E0', num: colors.accentDark },
    { label: 'Reviews', value: passport?.reviews_written ?? 0, icon: '✍️', tint: '#F3ECFB', num: '#7C3AED' },
    { label: 'Likes', value: passport?.total_likes_received ?? 0, icon: '❤️', tint: '#FDE8EF', num: '#BE185D' },
  ];

  return (
    <View style={styles.passport}>
      {/* Passport stats — colourful tiles, 3 per row */}
      <View style={styles.passportStats}>
        {stats.map(s => (
          <View key={s.label} style={[styles.passportStat, { backgroundColor: s.tint }]}>
            <RText style={{ fontSize: 26, lineHeight: 32 }}>{s.icon}</RText>
            <RText style={[styles.passportStatNum, { color: s.num }]}>{s.value}</RText>
            <Caption color={colors.textSecondary} style={{ fontWeight: '700' }}>{s.label}</Caption>
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
function StreakCard({ weeks, compact }: { weeks: number; compact?: boolean }) {
  const active = weeks > 0;
  const nextMilestone = Math.ceil((weeks + (active ? 0.0001 : 1)) / 5) * 5;
  const progress = active ? (weeks % 5 === 0 ? 1 : (weeks % 5) / 5) : 0;

  // Compact half-width variant used beside the Passport button.
  if (compact) {
    return (
      <LinearGradient
        colors={active ? ['#FF7A45', '#D94841'] : [colors.gray100, colors.gray200]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.streakCompact}
      >
        <RText style={{ fontSize: 22, lineHeight: 28 }}>{active ? '🔥' : '🌱'}</RText>
        <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
          <RText style={[styles.streakNumCompact, { color: active ? colors.white : colors.textPrimary }]}>{weeks}</RText>
          <RText variant="labelSmall" color={active ? colors.whiteTransparent90 : colors.textSecondary} style={{ marginLeft: 5 }}>
            wk streak
          </RText>
        </View>
        <View style={[styles.streakTrack, { marginTop: 4, backgroundColor: active ? 'rgba(255,255,255,0.3)' : colors.gray300 }]}>
          <View style={[styles.streakFill, { width: `${Math.round(progress * 100)}%`, backgroundColor: active ? colors.white : colors.gray400 }]} />
        </View>
      </LinearGradient>
    );
  }

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

  // Rank uses the fine-grained rank_score (set by pairwise comparisons),
  // falling back to rating*2 for reviews that predate ranking.
  const scoreOf = (r: Review) => r.rank_score ?? (r.rating ?? 0) * 2;
  const rankOf = new Map(
    [...filtered].sort((a, b) => scoreOf(b) - scoreOf(a)).map((r, i) => [r.id, i + 1]),
  );

  const sorted =
    mode === 'distance' && coords
      ? byDistance(filtered, coords, r => ({ lat: r.restaurant?.latitude, lng: r.restaurant?.longitude }))
      : [...filtered].sort((a, b) => scoreOf(b) - scoreOf(a));

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
function ListsTab({ lists }: { lists: List[] }) {
  // Custom Lists is available to everyone — curate + share themed collections.
  return (
    <View style={{ paddingHorizontal: spacing[4], paddingTop: spacing[2] }}>
      <TouchableOpacity style={styles.newListBtn} onPress={() => router.push('/list/new')} activeOpacity={0.85}>
        <Ionicons name="add-circle" size={22} color={colors.primary} />
        <RText variant="titleSmall" color={colors.primary} style={{ marginLeft: spacing[2] }}>New list</RText>
      </TouchableOpacity>

      {lists.length === 0 ? (
        <View style={{ alignItems: 'center', paddingVertical: spacing[10] }}>
          <RText style={{ fontSize: 40, lineHeight: 52 }}>📋</RText>
          <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[3], maxWidth: 260 }}>
            Create your first list — like “Top Cafés in PJ” — then share it as an image on social.
          </Caption>
        </View>
      ) : (
        lists.map(list => (
          <TouchableOpacity key={list.id} style={styles.listRow} onPress={() => router.push(`/list/${list.id}`)} activeOpacity={0.8}>
            <LinearGradient colors={[colors.primary, colors.accent]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.listRowIcon}>
              <Ionicons name="list" size={20} color={colors.white} />
            </LinearGradient>
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <RText variant="titleSmall" numberOfLines={1}>{list.title}</RText>
              <Caption color={colors.textTertiary}>
                {(list.restaurant_count ?? 0)} places · {(list.follower_count ?? 0)} saves
              </Caption>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
          </TouchableOpacity>
        ))
      )}
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
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...(shadows.xs as object),
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

  // Passport button + compact streak row
  streakRow: {
    flexDirection: 'row',
    gap: spacing[3],
    marginBottom: spacing[4],
  },
  passportBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
    borderRadius: radius.xl,
    padding: spacing[3] + 2,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...(shadows.xs as object),
  },
  streakCompact: {
    flex: 1,
    borderRadius: radius.xl,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    justifyContent: 'center',
  },
  repairBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    marginBottom: spacing[4],
    padding: spacing[3] + 2,
    borderRadius: radius.xl,
    backgroundColor: colors.accentSurface,
    borderWidth: 1,
    borderColor: colors.accentLight,
  },
  repairCta: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
  streakNumCompact: { fontSize: 24, lineHeight: 30, fontWeight: '800' },

  // Passport popup
  passportOverlay: { flex: 1, backgroundColor: colors.blackTransparent40, justifyContent: 'flex-end' },
  passportSheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius['2xl'],
    borderTopRightRadius: radius['2xl'],
    paddingTop: spacing[4],
    paddingHorizontal: spacing[4],
    maxHeight: '85%',
  },
  passportSheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing[3],
  },

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
  referCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    padding: spacing[4],
    marginBottom: spacing[2],
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginVertical: spacing[1] },
  referBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
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
    backgroundColor: colors.background,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3] + 2,
    gap: 3,
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 15, letterSpacing: 0.2 },
  tabCountText: { fontSize: 13, fontWeight: '800', lineHeight: 16 },
  tabActive: { borderBottomColor: colors.primary },
  tabContent: { paddingTop: spacing[2] },
  newListBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: colors.primary, borderStyle: 'dashed',
    borderRadius: radius.xl, paddingVertical: spacing[3], marginBottom: spacing[4],
  },
  listRow: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  listRowIcon: {
    width: 44, height: 44, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  emptyTab: {
    alignItems: 'center',
    paddingVertical: spacing[16],
    gap: spacing[2],
  },
  reviewsList: { paddingHorizontal: spacing[4], paddingTop: spacing[2], gap: spacing[3] },
  // Full-bleed feed-style Activity list (edge-to-edge, separators like the feed).
  feedList: { paddingTop: spacing[2] },
  feedSeparator: { height: 8, backgroundColor: colors.backgroundSecondary },
  // No horizontal padding here — the modal sheet already pads by spacing[4].
  passport: { paddingTop: spacing[2], paddingBottom: spacing[4] },
  passportStats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
    marginBottom: spacing[6],
  },
  passportStat: {
    // Fits the sheet's inner width (screen − sheet padding), 3 tiles per row.
    width: (SCREEN_WIDTH - spacing[4] * 2 - spacing[3] * 2) / 3,
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[2],
    gap: spacing[1],
  },
  passportStatNum: { fontSize: 26, lineHeight: 30, fontWeight: '800' },
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
