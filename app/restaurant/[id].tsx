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
  getRestaurantById, getRestaurantReviews, getRestaurantPhotos,
  getPopularDishes, getFriendReviews, saveRestaurant, unsaveRestaurant,
} from '@/services/restaurants';
import { getRestaurantFoodTags, toggleFoodTag } from '@/services/dishes';
import { FoodTagList } from '@/components/ui/FoodTag';
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

  const { data: restaurant, isLoading } = useQuery({
    queryKey: queryKeys.restaurant(id),
    queryFn: () => getRestaurantById(id, profile?.id),
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: queryKeys.restaurantReviews(id),
    queryFn: () => getRestaurantReviews(id),
    enabled: !!id,
  });

  const { data: photos } = useQuery({
    queryKey: queryKeys.restaurantPhotos(id),
    queryFn: () => getRestaurantPhotos(id),
    enabled: !!id,
  });

  const { data: dishes } = useQuery({
    queryKey: ['dishes', id],
    queryFn: () => getPopularDishes(id),
    enabled: !!id,
  });

  const { data: friendReviews } = useQuery({
    queryKey: ['friend-reviews', id],
    queryFn: () => getFriendReviews(id, profile!.id),
    enabled: !!id && !!profile,
  });

  const { data: foodTags } = useQuery({
    queryKey: ['restaurant-tags', id, userId],
    queryFn: () => getRestaurantFoodTags(id, userId),
    enabled: !!id,
  });

  const tagMutation = useMutation({
    mutationFn: (tag: FoodTagType) => {
      if (!userId) return Promise.resolve({ added: false });
      return toggleFoodTag(userId, id, tag);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['restaurant-tags', id, userId] });
    },
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!profile) return;
      if (restaurant?.is_saved) {
        await unsaveRestaurant(profile.id, id);
      } else {
        await saveRestaurant(profile.id, id);
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
    if (restaurant.latitude && restaurant.longitude) {
      const wazeUrl = getWazeUrl(restaurant.latitude, restaurant.longitude);
      Linking.canOpenURL(wazeUrl).then(can => {
        if (can) Linking.openURL(wazeUrl);
        else {
          const url = restaurant.google_maps_url ?? `https://maps.google.com/?q=${restaurant.latitude},${restaurant.longitude}`;
          Linking.openURL(url);
        }
      });
    } else if (restaurant.waze_url ?? restaurant.google_maps_url) {
      Linking.openURL((restaurant.waze_url ?? restaurant.google_maps_url)!);
    }
  };

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
              )}
            </View>
          </View>

          {/* Quick actions */}
          <View style={styles.quickActions}>
            <TouchableOpacity style={styles.quickAction} onPress={handleDirections}>
              <RText style={{ fontSize: 20 }}>🗺️</RText>
              <RText variant="labelMedium" color={colors.textSecondary}>Waze</RText>
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
              onPress={() => router.push(`/review/new?restaurant=${id}`)}
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
                  <TouchableOpacity onPress={() => router.push(`/restaurant/${id}/tags`)}>
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
