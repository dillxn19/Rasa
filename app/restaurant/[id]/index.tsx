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
import { CoverImage } from '@/components/restaurants/CoverImage';
import { useAuthStore, selectCurrentUserId } from '@/stores/authStore';
import {
  getRestaurantByIdOrSlug, getRestaurantReviews, getRestaurantPhotos, getCommunityPhotos,
  getPopularDishes, getFriendReviews, saveRestaurant, unsaveRestaurant,
  getFollowersWhoSaved, getRestaurantRatingDistribution, deleteReviewForRestaurant,
} from '@/services/restaurants';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { getRestaurantFoodTags, toggleFoodTag, MIN_TAGS_TO_SURFACE } from '@/services/dishes';
import { useReviewedRestaurantIds } from '@/hooks/useReviewedRestaurants';
import { getUserCoins } from '@/services/coins';
import { SaveToListSheet } from '@/components/lists/SaveToListSheet';
import { PhotoViewerModal } from '@/components/restaurants/PhotoViewerModal';
import { useFeatureAccess, unlockWithCoins, FEATURES, type FeatureDef } from '@/services/features';
import { shareInvite } from '@/lib/referral';
import { FeatureGateModal } from '@/components/ui/FeatureGateModal';
import { FoodTagList } from '@/components/ui/FoodTag';
import { toast } from '@/stores/toastStore';
import { queryKeys, invalidateAfterReview } from '@/lib/queryClient';
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
  const [showSaveToList, setShowSaveToList] = useState(false);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [showDeleteReview, setShowDeleteReview] = useState(false);
  const friendsUnlocked = isUnlocked('friends_ratings');
  const whoSavedUnlocked = isUnlocked('who_saved');
  const storeAvgUnlocked = isUnlocked('store_averages');

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
  const reviewedIds = useReviewedRestaurantIds();
  const hasVisited = !!rid && reviewedIds.has(rid);

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

  const { data: communityPhotos } = useQuery({
    queryKey: ['restaurant-photos', rid],
    queryFn: () => getCommunityPhotos(rid),
    enabled: !!rid,
  });

  const { data: foodTags } = useQuery({
    queryKey: ['restaurant-tags', rid, userId],
    queryFn: () => getRestaurantFoodTags(rid, userId),
    enabled: !!rid,
  });

  const { data: whoSaved } = useQuery({
    queryKey: ['who-saved', rid, userId],
    queryFn: () => getFollowersWhoSaved(rid, userId!),
    enabled: !!rid && !!userId,
  });

  const { data: ratingDist } = useQuery({
    queryKey: ['rating-dist', rid],
    queryFn: () => getRestaurantRatingDistribution(rid),
    enabled: !!rid && storeAvgUnlocked,
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
      // Keep the shared saved set + the profile Saved tab in sync (['saved', uid]).
      if (profile) {
        qc.invalidateQueries({ queryKey: ['userSavedIds', profile.id] });
        qc.invalidateQueries({ queryKey: ['saved', profile.id] });
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    },
  });

  const deleteReviewMutation = useMutation({
    mutationFn: () => deleteReviewForRestaurant(profile!.id, rid),
    onSuccess: () => {
      setShowDeleteReview(false);
      invalidateAfterReview(qc, profile!.id, rid);
      qc.invalidateQueries({ queryKey: queryKeys.restaurant(id) });
      toast.success('Review deleted');
    },
    onError: () => { setShowDeleteReview(false); toast.error('Could not delete your review.'); },
  });

  const openStatus = restaurant ? getOpenStatus(restaurant.opening_hours) : null;

  const handleRate = () => {
    if (!restaurant) return;
    router.push({
      pathname: '/(tabs)/add',
      params: {
        restaurantId: rid,
        restaurantName: restaurant.name,
        restaurantCategory: restaurant.category,
        restaurantCity: restaurant.city ?? '',
      },
    } as any);
  };

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
              <CoverImage category={restaurant.category} emojiSize={72} style={styles.heroPhoto} transition={0} />
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
              {hasVisited ? (
                // Already rated → checkmark; tap to delete your review.
                <TouchableOpacity style={styles.navBtn} onPress={() => setShowDeleteReview(true)}>
                  <Ionicons name="checkmark-circle" size={22} color={colors.success} />
                </TouchableOpacity>
              ) : (
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
              )}
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

            {/* Short description (from Google editorial summary) */}
            {restaurant.description ? (
              <Body color={colors.textSecondary} style={{ marginTop: spacing[3], lineHeight: 21 }}>
                {restaurant.description}
              </Body>
            ) : null}

            {/* Rating block. Locked users see an IDENTICAL teaser whether or not
                the place has ratings (never leak rated-status). Unlocked users see
                the real average + count, or an honest "no ratings yet". */}
            <View style={styles.ratingBlock}>
              {!storeAvgUnlocked ? (
                <TouchableOpacity
                  style={styles.ratingLocked}
                  onPress={() => setGate(FEATURES.store_averages)}
                  activeOpacity={0.85}
                >
                  <View style={styles.ratingLockIcon}>
                    <Ionicons name="lock-closed" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <RText variant="titleSmall" color={colors.primary}>See community rating</RText>
                    <Caption color={colors.textSecondary}>Refer a friend to unlock</Caption>
                  </View>
                </TouchableOpacity>
              ) : restaurant.total_reviews > 0 ? (
                <View style={styles.ratingMain}>
                  <RText variant="rating" color={colors.textPrimary}>
                    {restaurant.overall_rating.toFixed(1)}
                  </RText>
                  <View style={{ marginLeft: spacing[2] }}>
                    <StarRating value={restaurant.overall_rating} size={18} readonly />
                    <Caption>
                      {restaurant.total_reviews.toLocaleString()} {restaurant.total_reviews === 1 ? 'rating' : 'ratings'}
                    </Caption>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.ratingUnrated} onPress={handleRate} activeOpacity={0.85}>
                  <View style={styles.ratingLockIcon}>
                    <Ionicons name="star-outline" size={16} color={colors.primary} />
                  </View>
                  <View>
                    <RText variant="titleSmall" color={colors.textPrimary}>No ratings yet</RText>
                    <Caption color={colors.textSecondary}>Be the first to review this place</Caption>
                  </View>
                </TouchableOpacity>
              )}

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

          {/* Community rating distribution (unlocked with store_averages) */}
          {storeAvgUnlocked && (ratingDist?.some(c => c > 0)) && (
            <View style={styles.distSection}>
              <H4 style={{ marginBottom: spacing[3] }}>Rating distribution</H4>
              {[5, 4, 3, 2, 1].map(star => {
                const count = ratingDist![star - 1];
                const total = ratingDist!.reduce((a, b) => a + b, 0);
                const pct = total ? count / total : 0;
                return (
                  <View key={star} style={styles.distRow}>
                    <RText style={styles.distStar}>{star}★</RText>
                    <View style={styles.distTrack}>
                      <View style={[styles.distFill, { width: `${Math.round(pct * 100)}%` }]} />
                    </View>
                    <RText style={styles.distCount}>{count}</RText>
                  </View>
                );
              })}
            </View>
          )}

          {/* Quick actions — unified circular tinted icons (consistent, premium). */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickActions}
          >
            <QuickAction icon="navigate" label="Maps" tint="#3B82F6" onPress={handleDirections} />
            {profile && (
              <QuickAction icon="bookmark" label="Save" tint={colors.primary} onPress={() => setShowSaveToList(true)} />
            )}
            {restaurant.phone_number && (
              <QuickAction icon="call" label="Call" tint={colors.success} onPress={() => Linking.openURL(`tel:${restaurant.phone_number}`)} />
            )}
            <QuickAction icon="logo-whatsapp" label="WhatsApp" tint="#25D366" onPress={handleWhatsAppShare} />
            {restaurant.website_url && (
              <QuickAction icon="globe-outline" label="Website" tint="#6D28D9" onPress={() => Linking.openURL(restaurant.website_url!)} />
            )}
          </ScrollView>

          {/* Community photos — every photo diners have posted here */}
          {(communityPhotos ?? []).length > 0 && (
            <View style={styles.photosSection}>
              <View style={styles.sectionHeaderRow}>
                <H4>Photos</H4>
                <Caption color={colors.textTertiary}>{communityPhotos!.length} from diners</Caption>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.photoStrip}>
                {(communityPhotos ?? []).map((p, i) => (
                  <TouchableOpacity key={`${p.reviewId}-${i}`} activeOpacity={0.9} onPress={() => setViewerIndex(i)}>
                    <Image source={{ uri: p.url }} style={styles.communityPhoto} contentFit="cover" transition={150} />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

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

          {/* Saved by friends (who_saved gated feature) */}
          {(whoSaved?.length ?? 0) > 0 && (
            whoSavedUnlocked ? (
              <View style={styles.whoSavedCard}>
                <View style={styles.whoSavedAvatars}>
                  {(whoSaved ?? []).slice(0, 4).map((u, i) => (
                    <View key={u.id} style={{ marginLeft: i === 0 ? 0 : -10 }}>
                      <Avatar uri={u.avatar_url} name={u.display_name} size="sm" showBorder />
                    </View>
                  ))}
                </View>
                <Body color={colors.textSecondary} style={{ flex: 1, marginLeft: spacing[3] }}>
                  {whoSaved!.length === 1
                    ? `${whoSaved![0].display_name} wants to try this`
                    : `${whoSaved![0].display_name} + ${whoSaved!.length - 1} more want to try this`}
                </Body>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.whoSavedLocked}
                onPress={() => setGate(FEATURES.who_saved)}
                activeOpacity={0.85}
              >
                <Ionicons name="lock-closed" size={14} color={colors.primary} />
                <Body color={colors.primary} style={{ marginLeft: spacing[2] }}>
                  See which friends saved this ({whoSaved!.length})
                </Body>
                <View style={{ flex: 1 }} />
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </TouchableOpacity>
            )
          )}

          {/* Community food tags — only surface as "community" once enough distinct
              people agree (MIN_TAGS_TO_SURFACE). Below that, a single person's tag
              isn't consensus, so we show an invite-to-tag hint instead. The full
              tag catalogue (incl. the user's own picks) lives on the /tags screen. */}
          {(() => {
            const communityTags = (foodTags ?? []).filter(t => t.count >= MIN_TAGS_TO_SURFACE);
            if (communityTags.length === 0 && !userId) return null;
            return (
              <View style={styles.tagsSection}>
                <View style={styles.sectionHeader}>
                  <H4>Community Tags</H4>
                  {userId && (
                    <TouchableOpacity onPress={() => router.push(`/restaurant/${rid}/tags`)}>
                      <Caption color={colors.primary}>+ Add tag</Caption>
                    </TouchableOpacity>
                  )}
                </View>
                {communityTags.length > 0 ? (
                  <FoodTagList
                    tags={communityTags}
                    onToggle={(tag) => tagMutation.mutate(tag)}
                    editable={!!userId}
                    maxVisible={8}
                  />
                ) : (
                  <TouchableOpacity onPress={() => router.push(`/restaurant/${rid}/tags`)} activeOpacity={0.7}>
                    <Caption color={colors.textSecondary}>
                      No community tags yet — be one of the first to tag this spot.
                    </Caption>
                  </TouchableOpacity>
                )}
              </View>
            );
          })()}

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
        onInvite={() => { setGate(null); const r = profile?.referral_code ?? profile?.username; if (r) shareInvite(r); }}
      />

      {profile && rid && (
        <SaveToListSheet
          visible={showSaveToList}
          userId={profile.id}
          restaurantId={rid}
          restaurantName={restaurant.name}
          onClose={() => setShowSaveToList(false)}
        />
      )}

      <ConfirmDialog
        visible={showDeleteReview}
        title="Delete your review?"
        message="Your rating, text and photos for this place will be removed."
        confirmLabel="Delete"
        destructive
        loading={deleteReviewMutation.isPending}
        onConfirm={() => deleteReviewMutation.mutate()}
        onCancel={() => setShowDeleteReview(false)}
      />

      {viewerIndex != null && (communityPhotos ?? []).length > 0 && (
        <PhotoViewerModal
          visible
          photos={communityPhotos ?? []}
          initialIndex={viewerIndex}
          reporterId={profile?.id ?? ''}
          onClose={() => setViewerIndex(null)}
        />
      )}
    </View>
  );
}

function QuickAction({
  icon, label, tint, onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  tint: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.quickAction} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.quickActionIcon, { backgroundColor: tint + '1A' }]}>
        <Ionicons name={icon} size={22} color={tint} />
      </View>
      <RText variant="labelSmall" color={colors.textSecondary} numberOfLines={1}>{label}</RText>
    </TouchableOpacity>
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
  ratingUnrated: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
    padding: spacing[3],
    flex: 1,
    marginRight: spacing[3],
  },
  ratingLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    padding: spacing[3],
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
    flex: 1,
    marginRight: spacing[3],
  },
  ratingLockIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  distSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[3], paddingVertical: 3 },
  distStar: { width: 28, fontSize: 13, fontWeight: '600', color: colors.textSecondary },
  distTrack: { flex: 1, height: 10, borderRadius: 5, backgroundColor: colors.gray100, overflow: 'hidden' },
  distFill: { height: 10, borderRadius: 5, backgroundColor: colors.primary },
  distCount: { width: 28, textAlign: 'right', fontSize: 13, color: colors.textSecondary },
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
    gap: spacing[4],
  },
  quickAction: {
    alignItems: 'center',
    gap: spacing[2],
    width: 60,
  },
  quickActionIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photosSection: {
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    marginBottom: spacing[3],
  },
  photoStrip: { paddingHorizontal: spacing[4], gap: spacing[2] },
  communityPhoto: { width: 130, height: 160, borderRadius: radius.lg, backgroundColor: colors.gray100 },
  reviewCTA: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
  },
  whoSavedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[3],
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
  },
  whoSavedAvatars: { flexDirection: 'row', alignItems: 'center' },
  whoSavedLocked: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[4],
    padding: spacing[3] + 2,
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.primaryLight,
    borderStyle: 'dashed',
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
