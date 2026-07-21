import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, H2, H3, H4, Body, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { StarRating } from '@/components/ui/StarRating';
import { Button } from '@/components/ui/Button';
import { useAuthStore, selectCurrentUserId } from '@/stores/authStore';
import {
  getRestaurantByIdOrSlug, getRestaurantReviews, getRestaurantPhotos,
  getPopularDishes, getFriendReviews, saveRestaurant, unsaveRestaurant,
} from '@/services/restaurants';
import { getRestaurantFoodTags, toggleFoodTag } from '@/services/dishes';
import { getUserCoins } from '@/services/coins';
import { useFeatureAccess, unlockWithCoins, FEATURES, type FeatureDef } from '@/services/features';
import { shareInvite } from '@/lib/referral';
import { FeatureGateModal } from '@/components/ui/FeatureGateModal';
import { FoodTagList } from '@/components/ui/FoodTag';
import { toast } from '@/stores/toastStore';
import { queryKeys } from '@/lib/queryClient';
import type { Review } from '@/types';
import { CATEGORY_LABELS, DIETARY_LABELS, PRICE_LABELS, type FoodTagType } from '@/types';
import { shareRestaurant, shareViaWhatsApp, getWazeUrl } from '@/lib/share';
import { getOpenStatus } from '@/lib/openingHours';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HEADER_HEIGHT = 300;

export default function RestaurantScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const userId = useAuthStore(selectCurrentUserId);
  const qc = useQueryClient();
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const { isUnlocked, referralCount } = useFeatureAccess();
  const [gate, setGate] = useState<FeatureDef | null>(null);
  const friendsUnlocked = isUnlocked('friends_ratings');

  const { data: coins = 0 } = useQuery({
    queryKey: ['userCoins', profile?.id],
    queryFn: () => getUserCoins(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 30,
  });

  const handleUnlockWithCoins = async (feature: FeatureDef) => {
    if (!profile) return;
    const result = await unlockWithCoins(profile.id, feature);
    if (result.success) {
      qc.invalidateQueries({ queryKey: ['featureUnlocks', profile.id] });
      qc.invalidateQueries({ queryKey: ['userCoins', profile.id] });
      toast.success(result.message);
      setGate(null);
    } else {
      toast.error(result.message);
    }
  };

  const { data: restaurant, isLoading, isError } = useQuery({
    queryKey: queryKeys.restaurant(id),
    queryFn: () => getRestaurantByIdOrSlug(id, profile?.id),
    enabled: !!id,
  });

  // `id` from the URL may be a slug; `rid` is always the resolved UUID used for
  // all downstream queries and mutations.
  const rid = restaurant?.id ?? '';

  const { data: reviews } = useQuery({
    queryKey: queryKeys.restaurantReviews(rid),
    queryFn: () => getRestaurantReviews(rid),
    enabled: !!rid,
  });

  const { data: photos } = useQuery({
    queryKey: queryKeys.restaurantPhotos(rid),
    queryFn: () => getRestaurantPhotos(rid),
    enabled: !!rid,
  });

  const { data: dishes } = useQuery({
    queryKey: ['dishes', rid],
    queryFn: () => getPopularDishes(rid),
    enabled: !!rid,
  });

  const { data: friendReviews } = useQuery({
    queryKey: ['friend-reviews', rid],
    queryFn: () => getFriendReviews(rid, profile!.id),
    enabled: !!rid && !!profile,
  });

  const { data: foodTags } = useQuery({
    queryKey: ['restaurant-tags', rid, userId],
    queryFn: () => getRestaurantFoodTags(rid, userId),
    enabled: !!rid,
  });

  const tagMutation = useMutation({
    mutationFn: (tag: FoodTagType) => {
      if (!userId || !rid) return Promise.resolve({ added: false });
      return toggleFoodTag(userId, rid, tag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-tags', rid, userId] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !rid) return;
      if (restaurant?.is_saved) {
        await unsaveRestaurant(profile.id, rid);
      } else {
        await saveRestaurant(profile.id, rid);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.restaurant(id) });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const openStatus = restaurant ? getOpenStatus(restaurant.opening_hours) : null;

  const handleShare = async () => {
    if (!restaurant) return;
    await shareRestaurant(id, restaurant.name);
  };

  const handleWhatsAppShare = async () => {
    if (!restaurant) return;
    await shareViaWhatsApp(`🍜 ${restaurant.name}\n⭐ ${restaurant.overall_rating.toFixed(1)} · ${restaurant.area ?? restaurant.city}\n\nCheck it out on Rasa: rasa.my/restaurant/${id}`);
  };

  const handleDirections = () => {
    if (!restaurant) return;
    const query = encodeURIComponent(
      restaurant.address
        ? `${restaurant.name}, ${restaurant.address}`
        : restaurant.name
    );
    // Try Google Maps app first, fall back to Google Maps website
    Linking.canOpenURL('comgooglemaps://').then(hasGoogleMaps => {
      if (hasGoogleMaps) {
        Linking.openURL(`comgooglemaps://?q=${query}`);
      } else {
        Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
      }
    });
  };

  if (isError) {
    return (
      <SafeAreaView style={[styles.container, { alignItems: 'center', justifyContent: 'center', padding: spacing[8] }]}>
        <RText style={{ fontSize: 48, lineHeight: 58 }}>🍽️</RText>
        <H4 style={{ marginTop: spacing[4] }}>Restaurant not found</H4>
        <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2] }}>
          This place may have been removed or the link is broken.
        </Caption>
        <TouchableOpacity style={styles.notFoundBtn} onPress={() => router.back()}>
          <RText variant="labelMedium" color={colors.white}>Go back</RText>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  if (isLoading || !restaurant) return null;

  const allPhotos = [
    ...(restaurant.cover_photo_url ? [{ url: restaurant.cover_photo_url }] : []),
    ...(photos ?? []).map(p => ({ url: p.url })),
  ];

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[]}>
        {/* Hero photos */}
        <View style={styles.heroContainer}>
          <ScrollView
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
              setActivePhotoIndex(index);
            }}
            scrollEventThrottle={16}
          >
            {allPhotos.length > 0 ? allPhotos.map((photo, i) => (
              <Image
                key={i}
                source={{ uri: photo.url }}
                style={styles.heroPhoto}
                contentFit="cover"
                transition={200}
              />
            )) : (
              <View style={[styles.heroPhoto, styles.heroPlaceholder]}>
                <Ionicons name="restaurant-outline" size={64} color={colors.gray300} />
              </View>
            )}
          </ScrollView>

          {/* Photo indicator */}
          {allPhotos.length > 1 && (
            <View style={styles.photoIndicator}>
              {allPhotos.map((_, i) => (
                <View
                  key={i}
                  style={[styles.dot, i === activePhotoIndex && styles.dotActive]}
                />
              ))}
            </View>
          )}

          <LinearGradient
            colors={['rgba(0,0,0,0.4)', 'transparent']}
            style={styles.topGradient}
          />

          {/* Nav buttons */}
          <SafeAreaView edges={['top']} style={styles.navBar}>
            <TouchableOpacity style={styles.navBtn} onPress={() => router.back()}>
              <Ionicons name="arrow-back" size={22} color={colors.white} />
            </TouchableOpacity>
            <View style={styles.navRight}>
              <TouchableOpacity style={styles.navBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color={colors.white} />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.navBtn}
                onPress={() => saveMutation.mutate()}
              >
                <Ionicons
                  name={restaurant.is_saved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={restaurant.is_saved ? colors.bookmarked : colors.white}
                />
              </TouchableOpacity>
            </View>
          </SafeAreaView>
        </View>

        {/* Restaurant info */}
        <View style={styles.content}>
          {/* Title block */}
          <View style={styles.titleBlock}>
            <View style={styles.titleRow}>
              <H2 style={{ flex: 1 }}>{restaurant.name}</H2>
              {restaurant.dietary_options.includes('halal_certified') && (
                <View style={styles.halalTag}>
                  <RText variant="caption" color={colors.halal} style={{ fontWeight: '700' }}>HALAL</RText>
                </View>
              )}
            </View>

            <View style={styles.metaRow}>
              <RText variant="bodyMedium" color={colors.textSecondary}>
                {CATEGORY_LABELS[restaurant.category]}
              </RText>
              <View style={styles.separator} />
              <RText variant="bodyMedium" color={colors.textSecondary}>
                {restaurant.area ?? restaurant.city}
              </RText>
              <View style={styles.separator} />
              <RText variant="bodyMedium" color={colors.textSecondary}>
                {restaurant.price_range}
              </RText>
              {openStatus && openStatus.isOpen !== null && (
                <>
                  <View style={styles.separator} />
                  <RText variant="bodyMedium" style={{ color: openStatus.color, fontWeight: '600' }}>
                    {openStatus.label}
                  </RText>
                </>
              )}
            </View>

            {/* Rating block */}
            <View style={styles.ratingBlock}>
              <View style={styles.ratingMain}>
                <RText variant="rating" color={colors.textPrimary}>
                  {restaurant.overall_rating.toFixed(1)}
                </RText>
                <View style={{ marginLeft: spacing[2] }}>
                  <StarRating value={restaurant.overall_rating} size={18} readonly />
                  <Caption>{restaurant.total_reviews.toLocaleString()} reviews</Caption>
                </View>
              </View>

              {friendReviews && friendReviews.length > 0 && (
                friendsUnlocked ? (
                  <View style={styles.friendRatingCard}>
                    <RText variant="labelSmall">FRIENDS</RText>
                    <View style={styles.friendRatingRow}>
                      {friendReviews.slice(0, 3).map(r => (
                        <Avatar
                          key={r.id}
                          uri={r.user?.avatar_url}
                          name={r.user?.display_name}
                          size="xs"
                          showBorder
                          style={{ marginLeft: -6 }}
                        />
                      ))}
                      <RText variant="titleSmall" style={{ marginLeft: spacing[2] }}>
                        {(friendReviews.reduce((a, r) => a + r.rating, 0) / friendReviews.length).toFixed(1)}★
                      </RText>
                    </View>
                  </View>
                ) : (
                  // Locked teaser — the Beli "see how friends rated" mechanic sits
                  // behind the friends_ratings referral unlock.
                  <TouchableOpacity
                    style={styles.friendLockedCard}
                    onPress={() => setGate(FEATURES.friends_ratings)}
                    activeOpacity={0.85}
                  >
                    <View style={styles.friendLockedAvatars}>
                      {friendReviews.slice(0, 3).map(r => (
                        <View key={r.id} style={styles.friendLockedAvatar}>
                          <Avatar uri={r.user?.avatar_url} name={r.user?.display_name} size="xs" style={{ marginLeft: -6 }} />
                        </View>
                      ))}
                    </View>
                    <View style={styles.friendLockedRow}>
                      <Ionicons name="lock-closed" size={12} color={colors.primary} />
                      <RText variant="labelSmall" color={colors.primary} style={{ marginLeft: 4 }}>
                        {friendReviews.length} {friendReviews.length === 1 ? 'friend' : 'friends'} rated
                      </RText>
                    </View>
                  </TouchableOpacity>
                )
              )}
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleDirections}>
              <RText style={{ fontSize: 20 }}>📍</RText>
              <RText variant="labelMedium" color={colors.textSecondary}>Maps</RText>
            </TouchableOpacity>
            {restaurant.phone_number && (
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => Linking.openURL(`tel:${restaurant.phone_number}`)}
              >
                <RText style={{ fontSize: 20 }}>📞</RText>
                <RText variant="labelMedium" color={colors.textSecondary}>Call</RText>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.quickAction} onPress={handleWhatsAppShare}>
              <RText style={{ fontSize: 20 }}>💬</RText>
              <RText variant="labelMedium" color={colors.textSecondary}>WhatsApp</RText>
            </TouchableOpacity>
            {restaurant.website_url && (
              <TouchableOpacity
                style={styles.quickAction}
                onPress={() => Linking.openURL(restaurant.website_url!)}
              >
                <RText style={{ fontSize: 20 }}>🌐</RText>
                <RText variant="labelMedium" color={colors.textSecondary}>Website</RText>
              </TouchableOpacity>
            )}
          </View>

          {/* Write review CTA */}
          <View style={styles.reviewCTA}>
            <Button
              label="Rate this restaurant"
              onPress={() => router.push({
                pathname: '/(tabs)/add',
                params: {
                  restaurantId: rid,
                  restaurantName: restaurant.name,
                  restaurantCategory: restaurant.category,
                  restaurantCity: restaurant.city ?? '',
                },
              } as any)}
              fullWidth
              variant="primary"
              size="lg"
            />
          </View>

          {/* Community food tags */}
          {(foodTags ?? []).length > 0 && (
            <View style={styles.tagsSection}>
              <View style={styles.sectionHeader}>
                <H4>Community Tags</H4>
                {userId && (
                  <TouchableOpacity onPress={() => router.push(`/restaurant/${rid}/tags`)}>
                    <Caption color={colors.primary}>+ Add tag</Caption>
                  </TouchableOpacity>
                )}
              </View>
              <FoodTagList
                tags={foodTags ?? []}
                onToggle={(tag) => tagMutation.mutate(tag)}
                editable={!!userId}
                maxVisible={8}
              />
            </View>
          )}

          {/* Popular dishes */}
          {dishes && dishes.length > 0 && (
            <View style={styles.section}>
              <H4 style={styles.sectionTitle}>Popular Dishes</H4>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dishesRow}>
                {dishes.map(dish => (
                  <View key={dish.id} style={styles.dishChip}>
                    {dish.photo_url && (
                      <Image source={{ uri: dish.photo_url }} style={styles.dishPhoto} contentFit="cover" />
                    )}
                    <View style={styles.dishChipContent}>
                      <RText variant="titleSmall" numberOfLines={1}>{dish.name}</RText>
                      <Caption>{dish.mention_count} mentions</Caption>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Reviews section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <H4>Reviews</H4>
              <TouchableOpacity>
                <Caption color={colors.primary}>See all</Caption>
              </TouchableOpacity>
            </View>

            {(reviews ?? []).slice(0, 5).map(review => (
              <ReviewRow key={review.id} review={review} />
            ))}
          </View>

          {/* Info section */}
          <View style={styles.section}>
            <H4 style={styles.sectionTitle}>Information</H4>

            <View style={styles.infoCard}>
              <InfoRow icon="location-outline" label={restaurant.address} />
              {restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0 && (
                <InfoRow icon="time-outline" label="See opening hours" />
              )}
              {restaurant.phone_number && (
                <InfoRow icon="call-outline" label={restaurant.phone_number} />
              )}
              {restaurant.description && (
                <InfoRow icon="information-circle-outline" label={restaurant.description} />
              )}
            </View>

            {/* Dietary options */}
            {restaurant.dietary_options.length > 0 && (
              <View style={styles.dietaryChips}>
                {restaurant.dietary_options.map(opt => (
                  <View key={opt} style={styles.dietaryChip}>
                    <RText variant="caption" color={colors.textSecondary}>
                      {DIETARY_LABELS[opt]}
                    </RText>
                  </View>
                ))}
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <FeatureGateModal
        feature={gate}
        referralCount={referralCount}
        coins={coins}
        onClose={() => setGate(null)}
        onUnlockWithCoins={handleUnlockWithCoins}
        onInvite={() => { setGate(null); if (profile?.username) shareInvite(profile.username); }}
      />
    </View>
  );
}

function ReviewRow({ review }: { review: Review }) {
  return (
    <View style={styles.reviewRow}>
      <Avatar uri={review.user?.avatar_url} name={review.user?.display_name} size="sm" />
      <View style={styles.reviewContent}>
        <View style={styles.reviewHeader}>
          <RText variant="titleSmall">{review.user?.display_name ?? 'Anonymous'}</RText>
          <StarRating value={review.rating} size={12} readonly compact />
        </View>
        {review.content && (
          <Body numberOfLines={3} color={colors.textSecondary}>
            {review.content}
          </Body>
        )}
        {review.photos && review.photos.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: spacing[2] }}>
            {review.photos.map((photo, i) => (
              <Image
                key={i}
                source={{ uri: photo }}
                style={styles.reviewPhoto}
                contentFit="cover"
              />
            ))}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

function InfoRow({ icon, label }: { icon: keyof typeof Ionicons.glyphMap; label: string }) {
  return (
    <View style={styles.infoRow}>
      <Ionicons name={icon} size={18} color={colors.textSecondary} style={{ marginTop: 2 }} />
      <Body color={colors.textSecondary} style={{ flex: 1, marginLeft: spacing[3] }}>
        {label}
      </Body>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  notFoundBtn: {
    marginTop: spacing[6],
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
    borderRadius: radius.full,
  },
  heroContainer: { height: HEADER_HEIGHT, position: 'relative' },
  heroPhoto: { width: SCREEN_WIDTH, height: HEADER_HEIGHT },
  heroPlaceholder: { backgroundColor: colors.gray100, alignItems: 'center', justifyContent: 'center' },
  topGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 120,
  },
  navBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[2],
  },
  navRight: { flexDirection: 'row', gap: spacing[2] },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.blackTransparent40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoIndicator: {
    position: 'absolute',
    bottom: spacing[4],
    alignSelf: 'center',
    flexDirection: 'row',
    gap: spacing[1],
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.whiteTransparent80 },
  dotActive: { backgroundColor: colors.white, width: 18 },
  content: { paddingBottom: 40 },
  titleBlock: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing[3], marginBottom: spacing[2] },
  halalTag: {
    backgroundColor: colors.halalBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.halal,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginBottom: spacing[4] },
  separator: { width: 3, height: 3, borderRadius: 1.5, backgroundColor: colors.gray300 },
  ratingBlock: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ratingMain: { flexDirection: 'row', alignItems: 'center' },
  friendRatingCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    padding: spacing[3],
    gap: spacing[1],
  },
  friendRatingRow: { flexDirection: 'row', alignItems: 'center', marginLeft: 6 },
  friendLockedCard: {
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    padding: spacing[3],
    alignItems: 'center',
    gap: spacing[1],
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  friendLockedAvatars: { flexDirection: 'row', marginLeft: 6, opacity: 0.55 },
  friendLockedAvatar: {},
  friendLockedRow: { flexDirection: 'row', alignItems: 'center' },
  quickActions: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  quickAction: {
    flex: 1,
    alignItems: 'center',
    gap: spacing[1],
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  reviewCTA: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  tagsSection: {
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  section: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  sectionTitle: { marginBottom: spacing[4] },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  dishesRow: { gap: spacing[3], paddingRight: spacing[4] },
  dishChip: {
    width: 120,
    borderRadius: radius.xl,
    overflow: 'hidden',
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dishPhoto: { width: '100%', height: 80 },
  dishChipContent: { padding: spacing[3] },
  reviewRow: {
    flexDirection: 'row',
    gap: spacing[3],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  reviewContent: { flex: 1, gap: spacing[1] },
  reviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reviewPhoto: {
    width: 100,
    height: 80,
    borderRadius: radius.lg,
    marginRight: spacing[2],
  },
  infoCard: {
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[4],
    gap: spacing[4],
  },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start' },
  dietaryChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  dietaryChip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
