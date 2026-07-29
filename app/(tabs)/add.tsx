import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput, TouchableOpacity,
  Image as RNImage, KeyboardAvoidingView, Platform, ActivityIndicator,
  Keyboard, Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import { router, useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Animated, { useSharedValue, withSpring, useAnimatedStyle } from 'react-native-reanimated';
import { MonthCalendar } from '@/components/ui/MonthCalendar';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, H4, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { Avatar } from '@/components/ui/Avatar';
import { RatingPicker } from '@/components/ui/StarRating';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { submitReview, getUserReviewForRestaurant, saveRestaurant, unsaveRestaurant } from '@/services/restaurants';
import { searchDishes, tagDish } from '@/services/dishes';
import {
  searchPlaces, resolvePlace, rasaHitToAlgolia, startPlacesSession, endPlacesSession,
  type PlacesSearchResult,
} from '@/services/places';
import { awardReviewRewards } from '@/services/rewards';
import { track } from '@/lib/analytics';
import { useUserLocation } from '@/hooks/useUserLocation';
import { moderateImage } from '@/services/moderation';
import { ReviewSuccessOverlay, type ReviewSuccessData } from '@/components/ui/ReviewSuccessOverlay';
import { toast } from '@/stores/toastStore';
import { uploadReviewPhoto, supabase } from '@/lib/supabase';
import { invalidateAfterReview, queryKeys } from '@/lib/queryClient';
import { RankCompareModal } from '@/components/reviews/RankCompareModal';
import type { AlgoliaRestaurant } from '@/types';
import { CATEGORY_LABELS } from '@/types';

// ─── Step types ───────────────────────────────────────────────
type Step = 'restaurant' | 'rate' | 'details';

const STEP_LABELS: Record<Step, string> = {
  restaurant: 'Where did you eat?',
  rate:       'How was it?',
  details:    'Tell us more',
};

// ─── Visit-date helpers ───────────────────────────────────────
function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function yesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d;
}

export default function AddReviewScreen() {
  const { profile } = useAuthStore();
  const { halalOnly } = useSettingsStore();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();
  const location = useUserLocation();
  const locationRef = useRef(location.coords);
  locationRef.current = location.coords;

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
  const [visitDate, setVisitDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState<ReviewSuccessData | null>(null);
  const [rankCtx, setRankCtx] = useState<{ reviewId: string; restaurantName: string; rating: number } | null>(null);
  const pendingSuccess = useRef<ReviewSuccessData | null>(null);

  // Dish tagging (details step — "What did you eat here?")
  type TaggedDish = { id?: string; name: string };
  const [taggedDishes, setTaggedDishes] = useState<TaggedDish[]>([]);
  const [dishQuery, setDishQuery] = useState('');
  const [debouncedDishQuery, setDebouncedDishQuery] = useState('');
  const dishDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [placeResults, setPlaceResults] = useState<PlacesSearchResult>({ rasa: [], google: [] });
  const [isSearching, setIsSearching] = useState(false);
  const [resolvingPlaceId, setResolvingPlaceId] = useState<string | null>(null);
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const currentSessionActive = useRef(false);

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

  // Dish suggestions for the tagging section (details step)
  const { data: dishSuggestions = [] } = useQuery({
    queryKey: ['dishSearch', debouncedDishQuery],
    queryFn: () => searchDishes(debouncedDishQuery, 6),
    enabled: debouncedDishQuery.trim().length >= 2 && step === 'details',
  });

  const handleDishSearch = (text: string) => {
    setDishQuery(text);
    if (dishDebounceRef.current) clearTimeout(dishDebounceRef.current);
    dishDebounceRef.current = setTimeout(() => setDebouncedDishQuery(text), 250);
  };

  const addTaggedDish = (dish: TaggedDish) => {
    const name = dish.name.trim();
    if (!name) return;
    // Dedupe by id when known, otherwise by lowercased name.
    const exists = taggedDishes.some(d =>
      dish.id ? d.id === dish.id : d.name.toLowerCase() === name.toLowerCase()
    );
    if (!exists) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTaggedDishes(prev => [...prev, { id: dish.id, name }]);
    }
    setDishQuery('');
    setDebouncedDishQuery('');
    Keyboard.dismiss();
  };

  const removeTaggedDish = (name: string) => {
    setTaggedDishes(prev => prev.filter(d => d.name !== name));
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
      if (!profile || !restaurant || rating === 0) return null;
      return await submitReview({
        user_id: profile.id,
        restaurant_id: restaurant.objectID,
        rating,
        content: content.trim() || undefined,
        photos,
        is_public: isPublic,
        visit_date: visitDate ? visitDate.toISOString().split('T')[0] : undefined,
      });
    },
    onSuccess: async (review) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      if (!profile || !restaurant) return;
      const rid = restaurant.objectID;

      // Award coins + advance the weekly streak, capturing the summary to show.
      // `existingReview` (loaded on the rate step) tells us whether this is an
      // edit — edits earn nothing, preventing coin farming.
      const rewards = await awardReviewRewards(profile.id, rid, restaurant.name, {
        isNewReview: !existingReview,
      }).catch(() => null);

      track('review_submitted', { rating, is_new: !existingReview, has_photos: photos.length > 0 });

      // Community dish tags — crowd-sources the dish graph. Fire-and-forget,
      // no coins (un-farmable). A new dish is created server-side if free-typed.
      taggedDishes.forEach(d => {
        tagDish({ userId: profile.id, restaurantId: rid, dishId: d.id, dishName: d.id ? undefined : d.name })
          .catch(() => {});
      });

      // Auto-remove bookmark now that it's been rated
      if (savedIds?.has(rid)) {
        unsaveRestaurant(profile.id, rid).catch(() => {});
      }

      // Single source of truth: refresh everything that shows review counts
      invalidateAfterReview(qc, profile.id, rid);

      const successData = {
        coinsEarned: rewards?.coinsEarned ?? (existingReview ? 0 : 25),
        streakWeeks: rewards?.streakWeeks ?? null,
        isNewWeek: rewards?.isNewWeek ?? false,
        isMilestone: rewards?.isMilestone ?? false,
        isFirstReview: rewards?.isFirstReview ?? false,
        isEdit: rewards?.isEdit ?? !!existingReview,
        cappedDaily: rewards?.cappedDaily ?? false,
        restaurantName: restaurant.name,
      };

      // Beli-style: slot this place among your other same-star places first,
      // then show the reward. Only for new ratings (edits keep their spot).
      if (review?.id && !existingReview) {
        pendingSuccess.current = successData;
        setRankCtx({ reviewId: review.id, restaurantName: restaurant.name, rating });
      } else {
        setSuccess(successData);
      }
    },
    onError: () => toast.error('Could not post your review. Try again.'),
  });

  function reset() {
    setStep('restaurant');
    setRestaurant(null);
    setRating(0);
    setContent('');
    setPhotos([]);
    setVisitDate(null);
    setSearchQuery('');
    setPlaceResults({ rasa: [], google: [] });
    endPlacesSession();
    setTaggedDishes([]);
    setDishQuery('');
    setDebouncedDishQuery('');
  }

  // Beli-style hybrid search: Rasa's own places first, then Google Places for
  // everything else. Guarantees any real restaurant (incl. chain branches) is
  // findable and matched to a single canonical Google location.
  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (query.length < 2) { setPlaceResults({ rasa: [], google: [] }); endPlacesSession(); return; }
    if (!currentSessionActive.current) { startPlacesSession(); currentSessionActive.current = true; }

    setIsSearching(true);
    searchTimeout.current = setTimeout(async () => {
      try {
        const c = locationRef.current;
        const res = await searchPlaces(query, c ? { lat: c.lat, lng: c.lng } : {});
        setPlaceResults(res);
      } catch {
        setPlaceResults({ rasa: [], google: [] });
      } finally {
        setIsSearching(false);
      }
    }, 300);
  }, []);

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
          // Scan for inappropriate content before showing it (fails open).
          const safe = await moderateImage(url);
          if (!safe) {
            toast.error('That photo looks inappropriate and was not added.');
            continue;
          }
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
        const safe = await moderateImage(url);
        if (!safe) {
          toast.error('That photo looks inappropriate and was not added.');
        } else {
          setPhotos(prev => [...prev, url]);
        }
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

  // Beli-style "+" on a search result: pick it and jump straight to rating.
  const selectAndRate = (r: AlgoliaRestaurant) => {
    setRestaurant(r);
    setPlaceResults({ rasa: [], google: [] });
    setSearchQuery('');
    currentSessionActive.current = false;
    goToRate(r);
  };

  // Selecting a Google result: resolve the place_id → canonical Rasa row
  // (get-or-create), then rate. This is what guarantees one row per real place.
  const selectGoogleAndRate = async (placeId: string, nameHint?: string) => {
    if (resolvingPlaceId) return;
    setResolvingPlaceId(placeId);
    try {
      const r = await resolvePlace(placeId, nameHint);
      currentSessionActive.current = false;
      if (r) {
        selectAndRate(r);
      } else {
        toast.error('Could not load that place. Try again.');
      }
    } catch {
      toast.error('Could not load that place. Try again.');
    } finally {
      setResolvingPlaceId(null);
    }
  };

  // Tapping a Google result's name opens its restaurant page (like Rasa rows),
  // rather than jumping straight into rating. Rating stays an explicit "+".
  const selectGoogleAndOpen = async (placeId: string, nameHint?: string) => {
    if (resolvingPlaceId) return;
    setResolvingPlaceId(placeId);
    try {
      const r = await resolvePlace(placeId, nameHint);
      currentSessionActive.current = false;
      if (r) router.push(`/restaurant/${r.objectID}`);
      else toast.error('Could not load that place. Try again.');
    } catch {
      toast.error('Could not load that place. Try again.');
    } finally {
      setResolvingPlaceId(null);
    }
  };

  // Beli-style bookmark on a search result: quick-save without rating.
  const toggleSave = async (r: AlgoliaRestaurant) => {
    if (!profile) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    const isSaved = savedIds?.has(r.objectID);
    try {
      if (isSaved) await unsaveRestaurant(profile.id, r.objectID);
      else await saveRestaurant(profile.id, r.objectID);
      qc.invalidateQueries({ queryKey: ['userSavedIds', profile.id] });
      qc.invalidateQueries({ queryKey: ['saved', profile.id] });
    } catch {
      toast.error('Could not update your saves.');
    }
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
        keyboardVerticalOffset={0}
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
                onPress={() => { setAddTab('people'); setSearchQuery(''); setPlaceResults({ rasa: [], google: [] }); endPlacesSession(); currentSessionActive.current = false; }}
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
                    onFocus={() => location.request()}
                    autoFocus
                    returnKeyType="search"
                  />
                  {isSearching && <ActivityIndicator size="small" color={colors.primary} />}
                  {searchQuery.length > 0 && !isSearching && (
                    <TouchableOpacity onPress={() => { setSearchQuery(''); setPlaceResults({ rasa: [], google: [] }); endPlacesSession(); currentSessionActive.current = false; }}>
                      <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                    </TouchableOpacity>
                  )}
                </View>

                {(placeResults.rasa.length > 0 || placeResults.google.length > 0) ? (
                  <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                    <View style={styles.resultsList}>
                      {/* Rasa's own places first (carry social data) */}
                      {placeResults.rasa.map(hit => {
                        const r = rasaHitToAlgolia(hit);
                        const reviewed = reviewedIds?.has(r.objectID);
                        const saved = savedIds?.has(r.objectID);
                        return (
                          <View key={r.objectID} style={styles.resultRow}>
                            <TouchableOpacity style={styles.resultMain} onPress={() => router.push(`/restaurant/${r.objectID}`)} activeOpacity={0.7}>
                              <View style={styles.resultIcon}>
                                <Ionicons name="restaurant" size={18} color={colors.primary} />
                              </View>
                              <View style={{ flex: 1 }}>
                                <RText variant="titleSmall" numberOfLines={1} style={{ flexShrink: 1 }}>{r.name}</RText>
                                <View style={styles.resultMeta}>
                                  <Caption>{CATEGORY_LABELS[r.category] ?? r.category}</Caption>
                                  <Caption color={colors.textTertiary}> · {r.area || r.city}</Caption>
                                  {r.price_range ? <Caption color={colors.textTertiary}> · {r.price_range}</Caption> : null}
                                </View>
                              </View>
                            </TouchableOpacity>

                            {reviewed ? (
                              <View style={styles.beenChip}>
                                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                                <RText variant="labelSmall" color={colors.success} style={{ marginLeft: 3, fontWeight: '700' }}>Been</RText>
                              </View>
                            ) : (
                              <View style={styles.resultActions}>
                                <TouchableOpacity style={styles.resultIconBtn} onPress={() => toggleSave(r)} hitSlop={6}>
                                  <Ionicons name={saved ? 'bookmark' : 'bookmark-outline'} size={20} color={saved ? colors.accent : colors.textSecondary} />
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.resultRateBtn} onPress={() => selectAndRate(r)} activeOpacity={0.85}>
                                  <Ionicons name="add" size={22} color={colors.white} />
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        );
                      })}

                      {/* Google Places for the long tail — rendered identically to
                          Rasa rows (Beli-style, no visible split). */}
                      {false && placeResults.google.length > 0 && (
                        <View style={styles.googleHeaderRow}>
                          <Ionicons name="globe-outline" size={13} color={colors.textTertiary} />
                          <Caption color={colors.textTertiary} style={{ marginLeft: 5, letterSpacing: 0.4 }}>MORE PLACES ON GOOGLE</Caption>
                        </View>
                      )}
                      {placeResults.google.map(g => (
                        <View key={g.placeId} style={styles.resultRow}>
                          <TouchableOpacity
                            style={styles.resultMain}
                            onPress={() => selectGoogleAndOpen(g.placeId, g.name)}
                            activeOpacity={0.7}
                            disabled={!!resolvingPlaceId}
                          >
                            <View style={styles.resultIcon}>
                              <Ionicons name="restaurant" size={18} color={colors.primary} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <RText variant="titleSmall" numberOfLines={1} style={{ flexShrink: 1 }}>{g.name}</RText>
                              {!!g.secondary && <Caption color={colors.textTertiary} numberOfLines={1}>{g.secondary}</Caption>}
                            </View>
                          </TouchableOpacity>
                          {resolvingPlaceId === g.placeId ? (
                            <ActivityIndicator size="small" color={colors.primary} style={{ marginRight: spacing[2] }} />
                          ) : (
                            <TouchableOpacity style={styles.resultRateBtn} onPress={() => selectGoogleAndRate(g.placeId, g.name)} activeOpacity={0.85} disabled={!!resolvingPlaceId}>
                              <Ionicons name="add" size={22} color={colors.white} />
                            </TouchableOpacity>
                          )}
                        </View>
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
                      Search any restaurant{'\n'}in Malaysia
                    </RText>
                    <Caption color={colors.textTertiary} align="center" style={{ marginTop: spacing[2] }}>
                      Powered by Google — every location, every branch
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
                    <View style={styles.resultsList}>
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
                    </View>
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

            {/* What did you eat? — community dish tags */}
            <View style={styles.detailSection}>
              <Caption style={{ marginBottom: spacing[2] }}>What did you eat here? <RText variant="caption" color={colors.textTertiary}>(optional)</RText></Caption>

              {taggedDishes.length > 0 && (
                <View style={styles.dishChipRow}>
                  {taggedDishes.map(d => (
                    <TouchableOpacity key={d.name} style={styles.dishChip} onPress={() => removeTaggedDish(d.name)} activeOpacity={0.7}>
                      <RText variant="labelMedium" color={colors.primary}>{d.name}</RText>
                      <Ionicons name="close" size={13} color={colors.primary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              <View style={styles.dishSearchBox}>
                <Ionicons name="restaurant-outline" size={16} color={colors.textTertiary} />
                <TextInput
                  style={styles.dishSearchInput}
                  placeholder="e.g. Nasi Lemak, Teh Tarik…"
                  placeholderTextColor={colors.textTertiary}
                  value={dishQuery}
                  onChangeText={handleDishSearch}
                  returnKeyType="done"
                  onSubmitEditing={() => dishQuery.trim() && addTaggedDish({ name: dishQuery })}
                  blurOnSubmit
                />
              </View>

              {dishQuery.trim().length >= 2 && (
                <View style={styles.dishSuggestions}>
                  {dishSuggestions.map(dish => (
                    <TouchableOpacity key={dish.id} style={styles.dishSuggestionRow} onPress={() => addTaggedDish({ id: dish.id, name: dish.name })}>
                      <Ionicons name="add-circle-outline" size={18} color={colors.primary} />
                      <RText variant="bodyMedium" style={{ marginLeft: spacing[2] }}>{dish.name}</RText>
                    </TouchableOpacity>
                  ))}
                  {/* Free-text add when no exact match */}
                  {!dishSuggestions.some(d => d.name.toLowerCase() === dishQuery.trim().toLowerCase()) && (
                    <TouchableOpacity style={styles.dishSuggestionRow} onPress={() => addTaggedDish({ name: dishQuery })}>
                      <Ionicons name="add-circle" size={18} color={colors.success} />
                      <RText variant="bodyMedium" style={{ marginLeft: spacing[2] }}>
                        Add "<RText variant="bodyMedium" style={{ fontWeight: '700' }}>{dishQuery.trim()}</RText>"
                      </RText>
                    </TouchableOpacity>
                  )}
                </View>
              )}
              <Caption color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
                Helps others find this dish here
              </Caption>
            </View>

            {/* Visit date (optional) */}
            <View style={styles.detailSection}>
              <Caption style={{ marginBottom: spacing[3] }}>When did you go? (optional)</Caption>
              <TouchableOpacity style={styles.dateBtnFull} onPress={() => setShowDatePicker(true)}>
                <Ionicons name="calendar-outline" size={18} color={visitDate ? colors.primary : colors.textTertiary} />
                <RText
                  variant="titleSmall"
                  color={visitDate ? colors.textPrimary : colors.textTertiary}
                  style={{ marginLeft: spacing[2] }}
                >
                  {visitDate
                    ? visitDate.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })
                    : 'Add a date'}
                </RText>
                {visitDate ? (
                  <TouchableOpacity onPress={() => setVisitDate(null)} hitSlop={10} style={{ marginLeft: 'auto' }}>
                    <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
                  </TouchableOpacity>
                ) : (
                  <Ionicons name="chevron-down" size={16} color={colors.textTertiary} style={{ marginLeft: 'auto' }} />
                )}
              </TouchableOpacity>
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

      {rankCtx && profile && (
        <RankCompareModal
          visible
          userId={profile.id}
          reviewId={rankCtx.reviewId}
          restaurantName={rankCtx.restaurantName}
          rating={rankCtx.rating}
          onDone={() => {
            setRankCtx(null);
            qc.invalidateQueries({ queryKey: queryKeys.userReviews(profile.id) });
            if (pendingSuccess.current) {
              setSuccess(pendingSuccess.current);
              pendingSuccess.current = null;
            }
          }}
        />
      )}

      {/* Visit-date calendar (pure JS — works in Expo Go) */}
      <Modal transparent visible={showDatePicker} animationType="fade" onRequestClose={() => setShowDatePicker(false)}>
        <TouchableOpacity style={styles.calOverlay} activeOpacity={1} onPress={() => setShowDatePicker(false)}>
          <TouchableOpacity activeOpacity={1} style={styles.calCard}>
            <RText variant="h4" style={{ marginBottom: spacing[2] }}>When did you go?</RText>
            <MonthCalendar
              value={visitDate ?? new Date()}
              onChange={(d) => { setVisitDate(d); setShowDatePicker(false); }}
              maximumDate={new Date()}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

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
    paddingBottom: spacing[8],
  },
  googleTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[2],
  },
  resultMain: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
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
  resultNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  resultMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
    flexWrap: 'wrap',
  },
  resultActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[2],
  },
  googleHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing[4],
    paddingBottom: spacing[2],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    marginTop: spacing[2],
  },
  resultIconBtn: { padding: spacing[1] },
  resultRateBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beenChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successLight,
    paddingHorizontal: spacing[2],
    paddingVertical: 4,
    borderRadius: radius.full,
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
  dishChipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[2],
    marginBottom: spacing[3],
  },
  dishChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: spacing[3],
    paddingRight: spacing[2],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primarySurface,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  dishSearchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  dishSearchInput: {
    flex: 1,
    fontSize: 15,
    color: colors.textPrimary,
    padding: 0,
  },
  dishSuggestions: {
    marginTop: spacing[2],
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  dishSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
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
  dateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  dateBtnFull: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  calOverlay: {
    flex: 1,
    backgroundColor: 'rgba(20,14,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  calCard: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius['3xl'],
    padding: spacing[5],
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
