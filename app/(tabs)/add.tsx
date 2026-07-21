import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image as RNImage, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, H4, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RatingPicker } from '@/components/ui/StarRating';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { submitReview, getUserReviewForRestaurant, unsaveRestaurant, searchRestaurantsSupabase } from '@/services/restaurants';
import { awardReviewRewards } from '@/services/rewards';
import { ReviewSuccessOverlay, type ReviewSuccessData } from '@/components/ui/ReviewSuccessOverlay';
import { toast } from '@/stores/toastStore';
import { uploadReviewPhoto, supabase } from '@/lib/supabase';
import { searchRestaurants } from '@/lib/algolia';
import { invalidateAfterReview } from '@/lib/queryClient';
import type { AlgoliaRestaurant } from '@/types';
import { CATEGORY_LABELS } from '@/types';

// ─── Step types ───────────────────────────────────────────────
type Step = 'restaurant' | 'rate' | 'details';

const STEP_LABELS: Record<Step, string> = {
  restaurant: 'Where did you eat?',
  rate:       'How was it?',
  details:    'Tell us more',
};

// ─── Meal time quick tag ──────────────────────────────────────
const MEAL_TAGS = [
  { label: '☀️ Breakfast', value: 'breakfast' },
  { label: '🍱 Lunch', value: 'lunch' },
  { label: '🌆 Dinner', value: 'dinner' },
  { label: '🌙 Supper', value: 'supper' },
];

export default function AddReviewScreen() {
  const { profile } = useAuthStore();
  const { halalOnly } = useSettingsStore();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  // URL params for pre-selected restaurant (from restaurant screen "Rate" button)
  const { restaurantId: preId, restaurantName: preName, restaurantCategory: preCat, restaurantCity: preCity } =
    useLocalSearchParams<{ restaurantId?: string; restaurantName?: string; restaurantCategory?: string; restaurantCity?: string }>();

  // Step state
  const [step, setStep] = useState<Step>('restaurant');
  const [addTab, setAddTab] = useState<'places' | 'people'>('places');
  const [peopleQuery, setPeopleQuery] = useState('');
  const [debouncedPeopleQuery, setDebouncedPeopleQuery] = useState('');
  const peopleDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Form state
  const [restaurant, setRestaurant] = useState<AlgoliaRestaurant | null>(null);
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);
  const [mealTag, setMealTag] = useState('');
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<ReviewSuccessData | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<AlgoliaRestaurant[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Existing review check (rating step)
  const { data: existingReview } = useQuery({
    queryKey: ['userReview', profile?.id, restaurant?.objectID],
    queryFn: () => getUserReviewForRestaurant(profile!.id, restaurant!.objectID),
    enabled: !!profile && !!restaurant && step === 'rate',
  });

  // Reviewed restaurant IDs (search step — to show checkmarks)
  const { data: reviewedIds } = useQuery({
    queryKey: ['userReviewedIds', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('reviews')
        .select('restaurant_id')
        .eq('user_id', profile!.id);
      return new Set((data ?? []).map((r: { restaurant_id: string }) => r.restaurant_id));
    },
    enabled: !!profile && step === 'restaurant',
    staleTime: 60_000,
  });

  // Saved restaurant IDs (search step — to show bookmark indicators)
  const { data: savedIds } = useQuery({
    queryKey: ['userSavedIds', profile?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('saved_restaurants')
        .select('restaurant_id')
        .eq('user_id', profile!.id);
      return new Set((data ?? []).map((r: { restaurant_id: string }) => r.restaurant_id));
    },
    enabled: !!profile && step === 'restaurant',
    staleTime: 60_000,
  });

  // People search
  const { data: peopleResults = [], isLoading: peopleSearching } = useQuery({
    queryKey: ['addPeopleSearch', debouncedPeopleQuery],
    queryFn: async () => {
      const { data } = await supabase
        .from('users')
        .select('id, username, display_name, avatar_url, city, total_reviews')
        .or(`display_name.ilike.%${debouncedPeopleQuery}%,username.ilike.%${debouncedPeopleQuery}%`)
        .eq('is_active', true)
        .neq('id', profile?.id ?? '')
        .order('total_reviews', { ascending: false })
        .limit(20);
      return data ?? [];
    },
    enabled: debouncedPeopleQuery.length >= 2 && addTab === 'people' && step === 'restaurant',
  });

  const handlePeopleSearch = (text: string) => {
    setPeopleQuery(text);
    if (peopleDebounceRef.current) clearTimeout(peopleDebounceRef.current);
    peopleDebounceRef.current = setTimeout(() => setDebouncedPeopleQuery(text), 250);
  };

  // Pre-select restaurant from URL params (e.g. when navigated from restaurant screen)
  useEffect(() => {
    if (preId && preName && step === 'restaurant' && !restaurant) {
      const pre: AlgoliaRestaurant = {
        objectID: preId,
        name: preName,
        slug: '',
        category: (preCat ?? 'restaurant') as AlgoliaRestaurant['category'],
        cuisines: [],
        city: preCity ?? '',
        area: '',
        address: '',
        overall_rating: 0,
        total_reviews: 0,
        cover_photo_url: '',
        price_range: '' as AlgoliaRestaurant['price_range'],
        dietary_options: [],
        tags: [],
      };
      setRestaurant(pre);
      setStep('rate');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preId, preName]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !restaurant || rating === 0) return;
      await submitReview({
        user_id: profile.id,
        restaurant_id: restaurant.objectID,
        rating,
        content: content.trim() || undefined,
        photos,
        is_public: isPublic,
      });
    },
    onSuccess: async () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!profile || !restaurant) return;
      const rid = restaurant.objectID;

      // Award coins + advance the weekly streak, capturing the summary to show.
      // `existingReview` (loaded on the rate step) tells us whether this is an
      // edit — edits earn nothing, preventing coin farming.
      const rewards = await awardReviewRewards(profile.id, rid, restaurant.name, {
        isNewReview: !existingReview,
      }).catch(() => null);

      // Auto-remove bookmark now that it's been rated
      if (savedIds?.has(rid)) {
        unsaveRestaurant(profile.id, rid).catch(() => {});
      }

      // Single source of truth: refresh everything that shows review counts
      invalidateAfterReview(qc, profile.id, rid);

      setSuccess({
        coinsEarned: rewards?.coinsEarned ?? (existingReview ? 0 : 25),
        streakWeeks: rewards?.streakWeeks ?? null,
        isNewWeek: rewards?.isNewWeek ?? false,
        isMilestone: rewards?.isMilestone ?? false,
        isFirstReview: rewards?.isFirstReview ?? false,
        isEdit: rewards?.isEdit ?? !!existingReview,
        cappedDaily: rewards?.cappedDaily ?? false,
        restaurantName: restaurant.name,
      });
    },
    onError: () => toast.error('Could not post your review. Try again.'),
  });

  function reset() {
    setStep('restaurant');
    setRestaurant(null);
    setRating(0);
    setContent('');
    setPhotos([]);
    setMealTag('');
    setSearchQuery('');
    setSearchResults([]);
  }

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setSearchResults([]); return; }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const result = await searchRestaurants({
          query,
          hitsPerPage: 8,
          ...(halalOnly ? { dietary: ['halal_certified'] } : {}),
        });
        // Fall back to Postgres when Algolia has no hits (e.g. index not seeded).
        if (result.hits.length > 0) {
          setSearchResults(result.hits);
        } else {
          const fb = await searchRestaurantsSupabase(query, { halalOnly }).catch(() => []);
          setSearchResults(fb);
        }
      } catch {
        // Algolia errored/unconfigured — go straight to Postgres.
        const fb = await searchRestaurantsSupabase(query, { halalOnly }).catch(() => []);
        setSearchResults(fb);
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, [halalOnly]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled && profile) {
      setUploading(true);
      try {
        for (const asset of result.assets) {
          const response = await fetch(asset.uri);
          const arrayBuffer = await response.arrayBuffer();
          const ext = asset.uri.split('.').pop()?.toLowerCase() ?? 'jpg';
          const mime = ext === 'png' ? 'image/png' : ext === 'heic' ? 'image/heic' : 'image/jpeg';
          const url = await uploadReviewPhoto(profile.id, arrayBuffer, mime);
          setPhotos(prev => [...prev, url]);
        }
      } catch (e: any) {
        toast.error(e?.message ?? 'Could not upload photos.', 'Upload failed');
      } finally {
        setUploading(false);
      }
    }
  };

  const takePhoto = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      toast.error('Allow camera access in Settings.', 'Camera access needed');
      return;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
    if (!result.canceled && profile) {
      setUploading(true);
      try {
        const asset = result.assets[0];
        const response = await fetch(asset.uri);
        const arrayBuffer = await response.arrayBuffer();
        const url = await uploadReviewPhoto(profile.id, arrayBuffer, 'image/jpeg');
        setPhotos(prev => [...prev, url]);
      } catch (e: any) {
        toast.error(e?.message ?? 'Could not upload photo.', 'Upload failed');
      } finally {
        setUploading(false);
      }
    }
  };

  const goToRate = (selected?: AlgoliaRestaurant) => {
    const r = selected ?? restaurant;
    if (!r) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('rate');
  };

  const goToDetails = () => {
    if (rating === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStep('details');
  };

  const progressSteps = ['restaurant', 'rate', 'details'];
  const stepIdx = progressSteps.indexOf(step);

  const safeTop = Math.max(insets.top, 44);

  return (
    <View style={styles.container}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={safeTop}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: safeTop + spacing[2] }]}>
          <TouchableOpacity onPress={() => step === 'restaurant' ? router.back() : setStep(step === 'details' ? 'rate' : 'restaurant')}>
            <Ionicons name={step === 'restaurant' ? 'close' : 'arrow-back'} size={24} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.progressRow}>
            {progressSteps.map((s, i) => (
              <View key={s} style={[styles.progressDot, i <= stepIdx && styles.progressDotActive]} />
            ))}
          </View>

          {step === 'details' ? (
            <Button
              label="Post"
              size="sm"
              onPress={() => submitMutation.mutate()}
              isDisabled={rating === 0 || !restaurant}
              isLoading={submitMutation.isPending}
            />
          ) : (
            <View style={{ width: 60 }} />
          )}
        </View>

        {/* Step label */}
        <View style={styles.stepLabelRow}>
          <RText variant="h3">{STEP_LABELS[step]}</RText>
          {restaurant && step !== 'restaurant' && (
            <Caption color={colors.textTertiary} numberOfLines={1}>at {restaurant.name}</Caption>
          )}
        </View>

        {/* ── Step 1: Restaurant ───────────────── */}
        {step === 'restaurant' && (
          <View style={{ flex: 1 }}>
            {/* Places / People tab switcher */}
            <View style={styles.addTabRow}>
              <TouchableOpacity
                style={[styles.addTab, addTab === 'places' && styles.addTabActive]}
                onPress={() => { setAddTab('places'); setPeopleQuery(''); setDebouncedPeopleQuery(''); }}
              >
                <Ionicons name="restaurant" size={14} color={addTab === 'places' ? colors.primary : colors.textTertiary} style={{ marginRight: 4 }} />
                <RText variant="labelMedium" color={addTab === 'places' ? colors.primary : colors.textTertiary}
                  style={{ fontWeight: addTab === 'places' ? '700' : '500' }}>Places</RText>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.addTab, addTab === 'people' && styles.addTabActive]}
                onPress={() => { setAddTab('people'); setSearchQuery(''); setSearchResults([]); }}
              >
                <Ionicons name="people" size={14} color={addTab === 'people' ? colors.primary : colors.textTertiary} style={{ marginRight: 4 }} />
                <RText variant="labelMedium" color={addTab === 'people' ? colors.primary : colors.textTertiary}
                  style={{ fontWeight: addTab === 'people' ? '700' : '500' }}>People</RText>
              </TouchableOpacity>
            </View>

            {/* ── Places search ── */}
            {addTab === 'places' && (
              <>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder={halalOnly ? "Search halal restaurants..." : "Search restaurants..."}
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={handleSearch}
                    autoFocus
                    returnKeyType="search"
                  />
                  {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                  {searchQuery.length > 0 && !isSearching && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setSearchResults([]); }}>
                      <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {searchResults.length > 0 ? (
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.resultsList}>
                      {searchResults.map(r => (
                        <TouchableOpacity
                          key={r.objectID}
                          style={styles.resultRow}
                          onPress={() => { setRestaurant(r); setSearchResults([]); setSearchQuery(''); goToRate(r); }}
                        >
                          <View style={styles.resultIcon}>
                            <Ionicons name="restaurant" size={18} color={colors.primary} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <RText variant="titleSmall">{r.name}</RText>
                            <View style={styles.resultMeta}>
                              <Caption>{CATEGORY_LABELS[r.category] ?? r.category}</Caption>
                              <Caption color={colors.textTertiary}> · {r.area ?? r.city}</Caption>
                              <Caption color={colors.textTertiary}> · {r.price_range}</Caption>
                            </View>
                          </View>
                          {reviewedIds?.has(r.objectID) && (
                            <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                          )}
                          {!reviewedIds?.has(r.objectID) && savedIds?.has(r.objectID) && (
                            <Ionicons name="bookmark" size={16} color={colors.accent} />
                          )}
                          {r.dietary_options?.includes('halal_certified') && (
                            <View style={styles.halalTag}>
                              <Caption color={colors.halal} style={{ fontWeight: '700', fontSize: 10 }}>HALAL</Caption>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </ScrollView>
                ) : searchQuery.length >= 2 && !isSearching ? (
                  <View style={styles.noResults}>
                    <Caption color={colors.textTertiary}>No results for "{searchQuery}"</Caption>
                    <Caption color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
                      Try a different name or check spelling
                    </Caption>
                  </View>
                ) : searchQuery.length === 0 ? (
                  <View style={styles.searchPrompt}>
                    <RText style={{ fontSize: 48, lineHeight: 58, textAlign: 'center' }}>🔍</RText>
                    <RText variant="bodyMedium" color={colors.textSecondary} align="center" style={{ marginTop: spacing[3] }}>
                      Start typing to search{'\n'}restaurants near you
                    </RText>
                    <Caption color={colors.textTertiary} align="center" style={{ marginTop: spacing[2] }}>
                      {halalOnly ? 'Showing halal certified only' : 'All restaurants'}
                    </Caption>
                  </View>
                ) : null}
              </>
            )}

            {/* ── People search ── */}
            {addTab === 'people' && (
              <>
                <View style={styles.searchContainer}>
                  <Ionicons name="search" size={18} color={colors.textTertiary} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name or @username"
                    placeholderTextColor={colors.textTertiary}
                    value={peopleQuery}
                    onChangeText={handlePeopleSearch}
                    autoFocus
                    returnKeyType="search"
                  />
                  {peopleSearching && <ActivityIndicator size="small" color={colors.primary} />}
                  {peopleQuery.length > 0 && !peopleSearching && (
                    <TouchableOpacity onPress={() => { setPeopleQuery(''); setDebouncedPeopleQuery(''); }}>
                      <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {peopleResults.length > 0 ? (
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    {(peopleResults as any[]).map(u => (
                      <TouchableOpacity
                        key={u.id}
                        style={styles.resultRow}
                        onPress={() => router.push(`/user/${u.username}`)}
                      >
                        <Avatar uri={u.avatar_url} name={u.display_name} size="md" />
                        <View style={{ flex: 1, marginLeft: spacing[3] }}>
                          <RText variant="titleSmall">{u.display_name}</RText>
                          <Caption color={colors.textSecondary}>@{u.username} · {u.city} · {u.total_reviews} reviews</Caption>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                ) : debouncedPeopleQuery.length >= 2 && !peopleSearching ? (
                  <View style={styles.noResults}>
                    <Caption color={colors.textTertiary}>No one found for "{peopleQuery}"</Caption>
                  </View>
                ) : (
                  <View style={styles.searchPrompt}>
                    <RText style={{ fontSize: 48, lineHeight: 58, textAlign: 'center' }}>👥</RText>
                    <RText variant="bodyMedium" color={colors.textSecondary} align="center" style={{ marginTop: spacing[3] }}>
                      Find food lovers{'\n'}by name or username
                    </RText>
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* ── Step 2: Rating ───────────────────── */}
        {step === 'rate' && (
          <View style={styles.ratingStep}>
            {/* Restaurant summary */}
            <View style={styles.restaurantSummary}>
              <View style={styles.summaryIcon}>
                <Ionicons name="restaurant" size={22} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <RText variant="titleMedium">{restaurant?.name}</RText>
                <Caption>{restaurant ? (CATEGORY_LABELS[restaurant.category] ?? restaurant.category) : ''} · {restaurant?.city}</Caption>
              </View>
              <TouchableOpacity onPress={() => setStep('restaurant')}>
                <Caption color={colors.primary}>Change</Caption>
              </TouchableOpacity>
            </View>

            {/* Already reviewed banner */}
            {existingReview && (
              <View style={styles.alreadyReviewedBanner}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <RText variant="labelMedium" color={colors.success} style={{ marginLeft: 6 }}>
                  You reviewed this before ({existingReview.rating}★) — submitting will update it
                </RText>
              </View>
            )}

            {/* Big rating picker */}
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <RatingPicker value={rating} onChange={existingReview ? (v) => { setRating(v); } : setRating} />
            </View>

            {/* Continue */}
            <View style={styles.ctaRow}>
              <Button
                label={rating === 0 ? 'Tap a star to rate' : 'Continue →'}
                onPress={goToDetails}
                isDisabled={rating === 0}
                fullWidth
                size="lg"
              />
            </View>
          </View>
        )}

        {/* ── Step 3: Details ──────────────────── */}
        {step === 'details' && (
          <ScrollView
            style={{ flex: 1 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: spacing[16] }}
          >
            {/* Photos first */}
            <View style={styles.photoSection}>
              <View style={styles.photoScroll}>
                <TouchableOpacity style={styles.addPhotoBtn} onPress={takePhoto}>
                  <Ionicons name="camera" size={24} color={colors.primary} />
                  <Caption color={colors.primary} style={{ marginTop: 4 }}>Camera</Caption>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.addPhotoBtn, { borderColor: colors.border }]} onPress={pickImage}>
                  {uploading ? (
                    <ActivityIndicator color={colors.textTertiary} />
                  ) : (
                    <>
                      <Ionicons name="images-outline" size={24} color={colors.textTertiary} />
                      <Caption style={{ marginTop: 4 }}>Gallery</Caption>
                    </>
                  )}
                </TouchableOpacity>
                {photos.map((photo, i) => (
                  <View key={i} style={styles.photoThumbWrap}>
                    <RNImage source={{ uri: photo }} style={styles.photoThumb} />
                    <TouchableOpacity
                      style={styles.removePhoto}
                      onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                    >
                      <Ionicons name="close-circle" size={22} color={colors.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            </View>

            {/* Review text */}
            <View style={styles.detailSection}>
              <TextInput
                style={styles.reviewInput}
                value={content}
                onChangeText={setContent}
                placeholder="What did you eat? What stood out? Be honest — your friends trust you."
                placeholderTextColor={colors.textTertiary}
                multiline
                numberOfLines={5}
                maxLength={500}
                textAlignVertical="top"
                returnKeyType="done"
                blurOnSubmit
              />
              <Caption color={colors.textTertiary} align="right">{500 - content.length} chars left</Caption>
            </View>

            {/* Meal time */}
            <View style={styles.detailSection}>
              <Caption style={{ marginBottom: spacing[3] }}>When did you go?</Caption>
              <View style={styles.tagRow}>
                {MEAL_TAGS.map(t => (
                  <TouchableOpacity
                    key={t.value}
                    style={[styles.mealTag, mealTag === t.value && styles.mealTagActive]}
                    onPress={() => setMealTag(mealTag === t.value ? '' : t.value)}
                  >
                    <RText style={{ fontSize: 13, color: mealTag === t.value ? colors.primary : colors.textSecondary }}>
                      {t.label}
                    </RText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Privacy */}
            <View style={styles.detailSection}>
              <TouchableOpacity style={styles.privacyRow} onPress={() => setIsPublic(!isPublic)}>
                <Ionicons
                  name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
                  size={20}
                  color={colors.textSecondary}
                />
                <View style={{ flex: 1, marginLeft: spacing[3] }}>
                  <RText variant="titleSmall">{isPublic ? 'Public' : 'Private'}</RText>
                  <Caption>{isPublic ? 'Visible to your followers' : 'Only visible to you'}</Caption>
                </View>
                <View style={[styles.toggle, isPublic && styles.toggleActive]}>
                  <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Submit */}
            <View style={styles.detailSection}>
              <Button
                label="Share Review"
                onPress={() => submitMutation.mutate()}
                isDisabled={rating === 0 || !restaurant}
                isLoading={submitMutation.isPending}
                fullWidth
                size="xl"
              />
              <Caption color={colors.textTertiary} align="center" style={{ marginTop: spacing[3] }}>
                Rating is required · Photo & review are optional
              </Caption>
            </View>
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {success && (
        <ReviewSuccessOverlay
          data={success}
          onDismiss={() => {
            setSuccess(null);
            reset();
            router.push('/(tabs)');
          }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  progressRow: {
    flexDirection: 'row',
    gap: spacing[2],
    alignItems: 'center',
  },
  progressDot: {
    width: 28,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.gray200,
  },
  progressDotActive: {
    backgroundColor: colors.primary,
  },
  stepLabelRow: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[3],
    gap: spacing[1],
  },

  // Step 1: Search
  addTabRow: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  addTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  addTabActive: { borderBottomColor: colors.primary },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing[4],
    marginBottom: spacing[3],
    backgroundColor: colors.gray100,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
  },
  resultsList: {
    paddingHorizontal: spacing[4],
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  resultIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  halalTag: {
    backgroundColor: colors.halalBg,
    borderRadius: radius.sm,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.halal,
  },
  noResults: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingBottom: spacing[12],
  },
  searchPrompt: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
    paddingBottom: spacing[12],
  },

  // Step 2: Rating
  ratingStep: {
    flex: 1,
    paddingHorizontal: spacing[4],
  },
  alreadyReviewedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDF7EE',
    borderRadius: radius.lg,
    padding: spacing[3],
    marginTop: spacing[3],
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing[2],
  },
  doneBtn: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
  },
  restaurantSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    marginTop: spacing[3],
    gap: spacing[3],
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  summaryIcon: {
    width: 44,
    height: 44,
    borderRadius: radius.xl,
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.sm as object),
  },
  ctaRow: {
    paddingBottom: spacing[8],
  },

  // Step 3: Details
  photoSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  photoScroll: {
    flexDirection: 'row',
    gap: spacing[3],
    flexWrap: 'nowrap',
  },
  addPhotoBtn: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySurface,
  },
  photoThumbWrap: {
    width: 88,
    height: 88,
    position: 'relative',
  },
  photoThumb: {
    width: 88,
    height: 88,
    borderRadius: radius.xl,
  },
  removePhoto: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  detailSection: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  reviewInput: {
    fontSize: 16,
    color: colors.textPrimary,
    minHeight: 120,
    lineHeight: 24,
    textAlignVertical: 'top',
  },
  tagRow: {
    flexDirection: 'row',
    gap: spacing[2],
    flexWrap: 'wrap',
  },
  mealTag: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  mealTagActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.gray300,
    padding: 2,
    justifyContent: 'center',
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  toggleThumbActive: { transform: [{ translateX: 18 }] },
});
