import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Share, ActivityIndicator, Pressable,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { StatusBar } from 'expo-status-bar';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import { useAuthStore } from '@/stores/authStore';
import { getMonthlyRecap, getRecapWindow, type RecapData } from '@/services/recap';
import { scoreColor } from '@/components/profile/ReviewCard';
import { useFeatureAccess } from '@/services/features';
import { shareInvite } from '@/lib/referral';
import { toast } from '@/stores/toastStore';
import { CATEGORY_LABELS } from '@/types';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const CATEGORY_EMOJI: Record<string, string> = {
  hawker: '🍜', mamak: '🥛', cafe: '☕', kopitiam: '🍳', fine_dining: '🥂',
  food_court: '🍱', night_market: '🌙', restaurant: '🍽️', fast_food: '🍔', bar: '🍸',
};

// Each slide gets its own warm gradient so swiping feels like a story.
const SLIDE_GRADIENTS: [string, string][] = [
  ['#D94841', '#8B1E1E'],
  ['#E07B39', '#B4801F'],
  ['#BE185D', '#7A0E3E'],
  ['#6D28D9', '#3B1D8F'],
  ['#4F8A5B', '#1F5C3A'],
  ['#0EA5E9', '#075985'],
  ['#1F2937', '#0B0F17'],
];

export default function RecapScreen() {
  const { profile } = useAuthStore();
  const { isUnlocked } = useFeatureAccess();
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const slideRefs = useRef<Array<View | null>>([]);

  // Recap is only viewable in the window: the last week of the recapped month
  // through the first week of the next month.
  const window = getRecapWindow();

  const { data: recap, isLoading } = useQuery({
    queryKey: ['monthlyRecap', profile?.id, window.monthLabel],
    queryFn: () => getMonthlyRecap(profile!.id, window.monthDate),
    enabled: !!profile && window.open,
    // Always refetch when the recap is opened — otherwise newly-rated places
    // wouldn't show until the cache expired (felt like the recap was "wrong").
    staleTime: 0,
    refetchOnMount: 'always',
  });

  if (!window.open) {
    return <RecapNotReady />;
  }

  // Recap unlocks once you've ranked 10 places (enough of a food story to be fun).
  const placesRanked = profile?.total_reviews ?? 0;
  if (placesRanked < 10) {
    return <RecapLocked remaining={10 - placesRanked} />;
  }

  if (isLoading || !recap) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.white} />
      </View>
    );
  }

  if (recap.isEmpty) {
    return <EmptyRecap monthLabel={recap.monthLabel} />;
  }

  const slides = buildSlides(recap, profile?.username ?? undefined);

  const onScroll = (e: any) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (i !== index) {
      setIndex(i);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  const goNext = () => {
    if (index < slides.length - 1) {
      scrollRef.current?.scrollTo({ x: (index + 1) * SCREEN_WIDTH, animated: true });
    }
  };

  const goPrev = () => {
    if (index > 0) {
      scrollRef.current?.scrollTo({ x: (index - 1) * SCREEN_WIDTH, animated: true });
    }
  };

  const handleShareText = async () => {
    const rating = recap.avgRating ? recap.avgRating.toFixed(1) : '—';
    await Share.share({
      message:
        `My ${recap.monthLabel} on Rasa 🍜\n` +
        `${recap.totalReviews} places rated · ${rating}★ avg\n` +
        (recap.topRestaurant ? `Top spot: ${recap.topRestaurant.name}\n` : '') +
        `Come eat with me on Rasa!`,
    }).catch(() => {});
  };

  // Captures the currently-visible slide as a PNG and opens the share sheet —
  // every slide is its own Instagrammable format (like Spotify Wrapped).
  const shareCurrent = async () => {
    const node = slideRefs.current[index];
    if (!node) return handleShareText();
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const uri = await captureRef(node, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your Rasa recap' });
      } else {
        await Share.share({ url: uri });
      }
    } catch {
      handleShareText();
    }
  };

  // Saves the current slide straight to the device's photo library.
  const saveCurrent = async () => {
    const node = slideRefs.current[index];
    if (!node) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { toast.error('Allow photo access to save the image.'); return; }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const uri = await captureRef(node, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      toast.success('Saved to your photos 📸');
    } catch {
      toast.error('Could not save the image.');
    }
  };

  // Inset the whole story from the device edges so the notch/camera never
  // covers a slide (the user wanted it "a bit smaller than the screen").
  const topPad = Math.max(insets.top, 12);
  const bottomPad = Math.max(insets.bottom, 12);

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, i) => (
          <View
            key={i}
            style={styles.captureWrap}
            collapsable={false}
            ref={(el) => { slideRefs.current[i] = el; }}
          >
            <Slide gradient={SLIDE_GRADIENTS[i % SLIDE_GRADIENTS.length]} handle={profile?.username ?? undefined}>
              {slide}
            </Slide>
          </View>
        ))}
      </ScrollView>

      {/* Tap left/right to go back/forward (middle stays free for swipe & taps) */}
      <View style={StyleSheet.absoluteFill as any} pointerEvents="box-none">
        <Pressable style={styles.tapLeft} onPress={goPrev} />
        <Pressable style={styles.tapRight} onPress={goNext} />
      </View>

      {/* Top bar: progress dots + share + close */}
      <View style={[styles.topBar, { paddingTop: topPad + spacing[2] }]} pointerEvents="box-none">
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.topBarBtn} onPress={saveCurrent} hitSlop={10}>
          <Ionicons name="download-outline" size={20} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarBtn} onPress={shareCurrent} hitSlop={10}>
          <Ionicons name="share-outline" size={20} color={colors.white} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.topBarBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.white} />
        </TouchableOpacity>
      </View>

      {/* Bottom action */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPad + spacing[4] }]} pointerEvents="box-none">
        {index < slides.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.shareBtn} onPress={shareCurrent} activeOpacity={0.9}>
            <Ionicons name="share-social" size={18} color={colors.textPrimary} />
            <RText variant="buttonMedium" color={colors.textPrimary} style={{ marginLeft: spacing[2] }}>
              Share this card
            </RText>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

// ─── Slide shell ──────────────────────────────────────────────

function Slide({ gradient, handle, children }: { gradient: [string, string]; handle?: string; children: React.ReactNode }) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.slide}>
      <View style={styles.slideSafe}>{children}</View>
      {/* Brand watermark — captured into every shared/saved image so each slide
          is instantly recognisable as Rasa (organic attribution, Wrapped-style). */}
      <View style={styles.brandMark} pointerEvents="none">
        <RText style={styles.brandDot}>🍜</RText>
        <RText style={styles.brandWord}>Rasa</RText>
        {handle ? <RText style={styles.brandHandle}>@{handle}</RText> : null}
      </View>
    </LinearGradient>
  );
}

// ─── Slide builders ───────────────────────────────────────────

function buildSlides(recap: RecapData, handle?: string): React.ReactNode[] {
  const slides: React.ReactNode[] = [];

  // 1 — Intro
  slides.push(
    <View style={styles.slideContent} key="intro">
      <Animated.View entering={FadeIn.duration(500)} style={styles.center}>
        <RText style={styles.bigEmoji}>🍜</RText>
        <RText style={styles.kicker}>YOUR {recap.monthLabel.toUpperCase()}, WRAPPED</RText>
        <RText style={styles.introTitle}>A month of{'\n'}good makan.</RText>
        <Caption color={colors.whiteTransparent80} style={{ marginTop: spacing[4] }}>
          Swipe to see your food story →
        </Caption>
      </Animated.View>
    </View>
  );

  // 2 — Volume + average
  slides.push(
    <View style={styles.slideContent} key="volume">
      <Animated.View entering={FadeInDown.duration(500)}>
        <RText style={styles.statLabelTop}>You rated</RText>
        <View style={styles.bigStatRow}>
          <RText style={styles.bigNumber}>{recap.totalReviews}</RText>
          <RText style={styles.bigStatUnit}>
            {recap.totalReviews === 1 ? 'place' : 'places'}
          </RText>
        </View>
        {recap.avgRating != null && (
          <View style={styles.avgRow}>
            <StarRating value={recap.avgRating} size={20} readonly color={colors.white} />
            <RText style={styles.avgText}>{recap.avgRating.toFixed(1)} average</RText>
          </View>
        )}
        {recap.photosShared > 0 && (
          <Caption color={colors.whiteTransparent80} style={{ marginTop: spacing[5] }}>
            📸 {recap.photosShared} {recap.photosShared === 1 ? 'photo' : 'photos'} shared
          </Caption>
        )}
      </Animated.View>
    </View>
  );

  // 3 — Top restaurant
  if (recap.topRestaurant) {
    const top = recap.topRestaurant;
    slides.push(
      <View style={styles.slideContentTight} key="top">
        <Animated.View entering={FadeInDown.duration(500)} style={{ alignItems: 'center', width: '100%' }}>
          <RText style={styles.kicker}>YOUR TOP SPOT</RText>
          <TouchableOpacity
            style={styles.topCard}
            activeOpacity={0.9}
            onPress={() => router.push(`/restaurant/${top.slug ?? top.id}`)}
          >
            {top.cover_photo_url ? (
              <Image source={{ uri: top.cover_photo_url }} style={styles.topPhoto} contentFit="cover" transition={300} />
            ) : (
              <View style={[styles.topPhoto, styles.topPhotoFallback]}>
                <RText style={{ fontSize: 56, lineHeight: 66 }}>
                  {CATEGORY_EMOJI[top.category ?? 'restaurant'] ?? '🍽️'}
                </RText>
              </View>
            )}
            <LinearGradient colors={['transparent', 'rgba(0,0,0,0.85)']} style={styles.topPhotoGradient} />
            <View style={styles.topCardInfo}>
              <RText variant="h3" color={colors.white} numberOfLines={2}>{top.name}</RText>
              <View style={styles.topCardMeta}>
                <View style={styles.topRatingPill}>
                  <RText style={{ fontSize: 13, lineHeight: 17 }}>⭐</RText>
                  <RText style={styles.topRatingText}>{top.rating.toFixed(1)}</RText>
                </View>
                {top.city && (
                  <Caption color={colors.whiteTransparent90} style={{ marginLeft: spacing[2] }}>
                    {top.city}
                  </Caption>
                )}
              </View>
            </View>
          </TouchableOpacity>
          <Caption color={colors.whiteTransparent80} style={{ marginTop: spacing[4] }}>
            Your highest rating this month — tap to revisit
          </Caption>
        </Animated.View>
      </View>
    );
  }

  // 3b — Top spots (Spotify-style top-5 with album-art thumbnails)
  if (recap.topRestaurants.length > 1) {
    slides.push(
      <View style={styles.slideContent} key="topspots">
        <Animated.View entering={FadeInDown.duration(500)} style={{ width: '100%' }}>
          <RText style={styles.kicker}>YOUR TOP 5 SPOTS</RText>
          <View style={{ marginTop: spacing[5], gap: spacing[3] }}>
            {recap.topRestaurants.map((r, i) => (
              <View key={r.id} style={styles.topSpotRow}>
                <RText style={styles.topSpotRank}>{i + 1}</RText>
                {r.cover_photo_url ? (
                  <Image source={{ uri: r.cover_photo_url }} style={styles.topSpotThumb} contentFit="cover" transition={200} />
                ) : (
                  <View style={[styles.topSpotThumb, styles.topSpotThumbFallback]}>
                    <RText style={{ fontSize: 24, lineHeight: 30 }}>{CATEGORY_EMOJI[r.category ?? 'restaurant'] ?? '🍽️'}</RText>
                  </View>
                )}
                <View style={{ flex: 1, marginHorizontal: spacing[3] }}>
                  <RText variant="titleMedium" color={colors.white} numberOfLines={1}>{r.name}</RText>
                  {r.city ? <Caption color={colors.whiteTransparent80} numberOfLines={1}>{r.city}</Caption> : null}
                </View>
                <View style={[styles.topSpotScore, { backgroundColor: scoreColor(r.rating) }]}>
                  <RText style={styles.topSpotScoreText}>
                    {r.rating % 1 === 0 ? r.rating.toFixed(0) : r.rating.toFixed(1)}
                  </RText>
                </View>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    );
  }

  // 3c — By the numbers (rich stat grid so the recap isn't plain)
  slides.push(
    <View style={styles.slideContent} key="numbers">
      <Animated.View entering={FadeInDown.duration(500)} style={{ width: '100%' }}>
        <RText style={styles.kicker}>BY THE NUMBERS</RText>
        <View style={styles.numbersGrid}>
          <NumberStat value={String(recap.totalReviews)} label={recap.totalReviews === 1 ? 'place rated' : 'places rated'} />
          <NumberStat value={recap.avgRating != null ? recap.avgRating.toFixed(1) : '—'} label="avg rating" />
          <NumberStat value={String(recap.photosShared)} label={recap.photosShared === 1 ? 'photo' : 'photos'} />
          <NumberStat value={String(recap.cuisinesTried)} label={recap.cuisinesTried === 1 ? 'cuisine' : 'cuisines'} />
          <NumberStat value={String(recap.fiveStarCount)} label="5★ meals" />
          <NumberStat value={String(recap.cities.length)} label={recap.cities.length === 1 ? 'city' : 'cities'} />
        </View>
        {recap.bestDayCount > 1 && (
          <Caption color={colors.whiteTransparent80} align="center" style={{ marginTop: spacing[5] }}>
            🔥 Your busiest day: {recap.bestDayCount} places in one day
          </Caption>
        )}
      </Animated.View>
    </View>
  );

  // 4 — Favorite category
  if (recap.topCategory) {
    const cat = recap.topCategory;
    slides.push(
      <View style={styles.slideContent} key="category">
        <Animated.View entering={FadeInDown.duration(500)} style={styles.center}>
          <RText style={styles.bigEmoji}>{CATEGORY_EMOJI[cat.key] ?? '🍽️'}</RText>
          <RText style={styles.statLabelTop}>Your go-to was</RText>
          <RText style={styles.categoryName}>
            {CATEGORY_LABELS[cat.key as keyof typeof CATEGORY_LABELS] ?? cat.key}
          </RText>
          <Caption color={colors.whiteTransparent80} style={{ marginTop: spacing[3] }}>
            {cat.count} {cat.count === 1 ? 'visit' : 'visits'} this month
          </Caption>

          {recap.topCategories.length > 1 && (
            <View style={styles.catList}>
              {recap.topCategories.slice(0, 3).map((c, i) => (
                <View key={c.key} style={styles.catListRow}>
                  <RText style={styles.catListRank}>{i + 1}</RText>
                  <RText style={styles.catListEmoji}>{CATEGORY_EMOJI[c.key] ?? '🍽️'}</RText>
                  <RText style={styles.catListName} numberOfLines={1}>
                    {CATEGORY_LABELS[c.key as keyof typeof CATEGORY_LABELS] ?? c.key}
                  </RText>
                  <RText style={styles.catListCount}>{c.count}</RText>
                </View>
              ))}
            </View>
          )}
        </Animated.View>
      </View>
    );
  }

  // 5 — Explorer + coins
  slides.push(
    <View style={styles.slideContent} key="explorer">
      <Animated.View entering={FadeInDown.duration(500)} style={{ width: '100%' }}>
        <RText style={styles.kicker}>YOU EXPLORED</RText>
        <View style={styles.explorerRow}>
          <View style={styles.explorerStat}>
            <RText style={styles.explorerNum}>{recap.cities.length}</RText>
            <Caption color={colors.whiteTransparent80}>
              {recap.cities.length === 1 ? 'city' : 'cities'}
            </Caption>
          </View>
          <View style={styles.explorerDivider} />
          <View style={styles.explorerStat}>
            <RText style={styles.explorerNum}>{recap.cuisinesTried}</RText>
            <Caption color={colors.whiteTransparent80}>
              {recap.cuisinesTried === 1 ? 'cuisine' : 'cuisines'}
            </Caption>
          </View>
          <View style={styles.explorerDivider} />
          <View style={styles.explorerStat}>
            <RText style={styles.explorerNum}>{recap.coinsEarned.toLocaleString()}</RText>
            <Caption color={colors.whiteTransparent80}>🪙 earned</Caption>
          </View>
        </View>
        {recap.cities.length > 0 && (
          <>
            <Caption color={colors.whiteTransparent80} align="center" style={{ marginTop: spacing[6] }}>
              Cities you ate your way through
            </Caption>
            <View style={styles.cityChips}>
              {recap.cities.map(c => (
                <View key={c} style={styles.cityChip}>
                  <RText variant="labelSmall" color={colors.white}>{c}</RText>
                </View>
              ))}
            </View>
          </>
        )}
      </Animated.View>
    </View>
  );

  // Final — compact, shareable summary (the "post to your story" card) over a
  // collage of the month's photos.
  slides.push(
    <View style={styles.slideContentTight} key="summary">
      {recap.photos.length > 0 && <SummaryCollage photos={recap.photos} />}
      <Animated.View entering={FadeIn.duration(500)} style={{ width: '100%', alignItems: 'center' }}>
        <RText style={styles.kicker}>{recap.monthLabel.toUpperCase()} · RASA WRAPPED</RText>
        <View style={styles.summaryCard}>
          <RText style={styles.summaryBrand}>🍜 My month in food</RText>
          <View style={styles.summaryGrid}>
            <SummaryStat value={String(recap.totalReviews)} label={recap.totalReviews === 1 ? 'place' : 'places'} />
            <SummaryStat value={recap.avgRating != null ? recap.avgRating.toFixed(1) : '—'} label="avg ★" />
            <SummaryStat value={String(recap.cities.length)} label={recap.cities.length === 1 ? 'city' : 'cities'} />
            <SummaryStat value={recap.coinsEarned.toLocaleString()} label="🪙 earned" />
          </View>
          {recap.topRestaurants.length > 0 && (
            <View style={styles.summaryTop3}>
              <RText style={styles.summaryLineLabel}>Top spots</RText>
              {recap.topRestaurants.slice(0, 3).map((r, i) => (
                <View key={r.id} style={styles.summaryRankRow}>
                  <RText style={styles.summaryRankNum}>{i + 1}</RText>
                  <RText style={styles.summaryRankName} numberOfLines={1}>{r.name}</RText>
                  <RText style={styles.summaryRankScore}>
                    {r.rating % 1 === 0 ? r.rating.toFixed(0) : r.rating.toFixed(1)}★
                  </RText>
                </View>
              ))}
            </View>
          )}
          {recap.topArea && (
            <View style={styles.summaryLine}>
              <RText style={styles.summaryLineLabel}>Favourite area</RText>
              <RText style={styles.summaryLineValue} numberOfLines={1}>{recap.topArea}</RText>
            </View>
          )}
          {recap.topCategory && (
            <View style={styles.summaryLine}>
              <RText style={styles.summaryLineLabel}>Go-to</RText>
              <RText style={styles.summaryLineValue} numberOfLines={1}>
                {CATEGORY_LABELS[recap.topCategory.key as keyof typeof CATEGORY_LABELS] ?? recap.topCategory.key}
              </RText>
            </View>
          )}
          {recap.cities.length > 0 && (
            <View style={styles.summaryLine}>
              <RText style={styles.summaryLineLabel}>Cities</RText>
              <RText style={[styles.summaryLineValue, styles.summaryCitiesValue]}>{recap.cities.join(', ')}</RText>
            </View>
          )}
          <RText style={styles.summaryHandle}>{handle ? `@${handle}` : 'me'} · rasa.my</RText>
        </View>
      </Animated.View>
    </View>
  );

  return slides;
}

// Vivid full-bleed 3×3 collage of the month's photos behind the summary card.
// Photos stay fully visible — only a soft edge vignette keeps the top/bottom
// chrome legible; the card itself provides its own contrast.
function SummaryCollage({ photos }: { photos: string[] }) {
  if (photos.length === 0) return null;
  // Adaptive mosaic that always FILLS the whole screen (no half-empty backdrop):
  // more photos → more columns → more, smaller cells. Minimum 2 columns (a 2×2+
  // grid). Cells are square and tiled/repeated to cover the full height.
  const cols = photos.length <= 4 ? 2 : photos.length <= 12 ? 3 : 4;
  const cell = SCREEN_WIDTH / cols;
  const rows = Math.max(2, Math.ceil(SCREEN_HEIGHT / cell));
  const total = cols * rows;
  const grid = Array.from({ length: total }, (_, i) => photos[i % photos.length]);
  return (
    <View style={styles.collage} pointerEvents="none">
      <View style={styles.collageGrid}>
        {grid.map((p, i) => (
          <Image key={i} source={{ uri: p }} style={{ width: cell, height: cell }} contentFit="cover" />
        ))}
      </View>
      <LinearGradient
        colors={['rgba(0,0,0,0.35)', 'transparent', 'transparent', 'rgba(0,0,0,0.35)']}
        locations={[0, 0.22, 0.78, 1]}
        style={StyleSheet.absoluteFill as any}
      />
    </View>
  );
}

function SummaryStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.summaryStat}>
      <RText style={styles.summaryStatValue}>{value}</RText>
      <RText style={styles.summaryStatLabel}>{label}</RText>
    </View>
  );
}

function NumberStat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.numberStat}>
      <RText style={styles.numberStatValue}>{value}</RText>
      <RText style={styles.numberStatLabel}>{label}</RText>
    </View>
  );
}

// Shown when the recap isn't unlocked yet (1 referral or coins).
// Locked until the user has ranked enough places to have a real food story.
function RecapLocked({ remaining }: { remaining: number }) {
  return (
    <LinearGradient colors={['#6D28D9', '#3B1D8F']} style={[styles.container, styles.center]}>
      <StatusBar hidden />
      <SafeAreaView style={[styles.center, { padding: spacing[8] }]}>
        <View style={styles.lockBadge}>
          <RText style={{ fontSize: 34, lineHeight: 42 }}>🔒</RText>
        </View>
        <RText variant="h2" color={colors.white} align="center" style={{ marginTop: spacing[5] }}>
          Your food story is loading
        </RText>
        <Caption color={colors.whiteTransparent90} align="center" style={{ marginTop: spacing[3], maxWidth: 300, lineHeight: 20 }}>
          Rank {remaining} more {remaining === 1 ? 'place' : 'places'} to unlock your recap — a shareable “food wrapped” of your top spots, cuisines and stats.
        </Caption>
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={() => { router.back(); router.push('/(tabs)/add'); }}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <RText variant="buttonMedium" color={colors.primary} style={{ marginLeft: spacing[2] }}>
            Rank a place
          </RText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing[4] }}>
          <RText variant="labelMedium" color={colors.whiteTransparent80}>Maybe later</RText>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

function LockedRecap({ onInvite }: { onInvite: () => void }) {
  return (
    <LinearGradient colors={['#6D28D9', '#3B1D8F']} style={[styles.container, styles.center]}>
      <StatusBar hidden />
      <SafeAreaView style={[styles.center, { padding: spacing[8] }]}>
        <View style={styles.lockBadge}>
          <RText style={{ fontSize: 34, lineHeight: 42 }}>✨</RText>
        </View>
        <RText variant="h2" color={colors.white} align="center" style={{ marginTop: spacing[5] }}>
          Your Monthly Recap
        </RText>
        <Caption color={colors.whiteTransparent90} align="center" style={{ marginTop: spacing[3], maxWidth: 300, lineHeight: 20 }}>
          A shareable “food wrapped” of your month — top spots, cuisines, cities and stats. Invite one friend to unlock it.
        </Caption>
        <TouchableOpacity style={styles.lockBtn} onPress={onInvite} activeOpacity={0.9}>
          <Ionicons name="gift" size={18} color={colors.primary} />
          <RText variant="buttonMedium" color={colors.primary} style={{ marginLeft: spacing[2] }}>
            Invite a friend to unlock
          </RText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing[4] }}>
          <RText variant="labelMedium" color={colors.whiteTransparent80}>Maybe later</RText>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

// Shown outside the viewing window (recap opens the last week of the month).
function RecapNotReady() {
  const now = new Date();
  const thisMonth = now.toLocaleString('en-US', { month: 'long' });
  return (
    <LinearGradient colors={['#6D28D9', '#3B1D8F']} style={[styles.container, styles.center]}>
      <StatusBar hidden />
      <SafeAreaView style={[styles.center, { padding: spacing[8] }]}>
        <View style={styles.lockBadge}>
          <RText style={{ fontSize: 34, lineHeight: 42 }}>🗓️</RText>
        </View>
        <RText variant="h2" color={colors.white} align="center" style={{ marginTop: spacing[5] }}>
          Not ready just yet
        </RText>
        <Caption color={colors.whiteTransparent90} align="center" style={{ marginTop: spacing[3], maxWidth: 300, lineHeight: 20 }}>
          Your Rasa Wrapped unlocks in the last week of {thisMonth} and stays up through the first week of next month. Keep rating places — it'll be worth it.
        </Caption>
        <TouchableOpacity
          style={styles.lockBtn}
          onPress={() => { router.back(); router.push('/(tabs)/add'); }}
          activeOpacity={0.9}
        >
          <Ionicons name="add" size={18} color={colors.primary} />
          <RText variant="buttonMedium" color={colors.primary} style={{ marginLeft: spacing[2] }}>
            Rate a place
          </RText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing[4] }}>
          <RText variant="labelMedium" color={colors.whiteTransparent80}>Maybe later</RText>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

// ─── Empty state ──────────────────────────────────────────────

function EmptyRecap({ monthLabel }: { monthLabel: string }) {
  return (
    <LinearGradient colors={['#D94841', '#8B1E1E']} style={[styles.container, styles.center]}>
      <SafeAreaView style={[styles.center, { padding: spacing[8] }]}>
        <RText style={styles.bigEmoji}>🍽️</RText>
        <RText variant="h2" color={colors.white} align="center" style={{ marginTop: spacing[4] }}>
          No recap yet
        </RText>
        <Caption color={colors.whiteTransparent90} align="center" style={{ marginTop: spacing[3], maxWidth: 280 }}>
          Rate a few places this {monthLabel} and your monthly recap will come to life here.
        </Caption>
        <TouchableOpacity
          style={styles.emptyBtn}
          onPress={() => { router.back(); router.push('/(tabs)/add'); }}
          activeOpacity={0.9}
        >
          <RText variant="buttonMedium" color={colors.primary}>Rate a place</RText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: spacing[4] }}>
          <RText variant="labelMedium" color={colors.whiteTransparent80}>Close</RText>
        </TouchableOpacity>
      </SafeAreaView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#8B1E1E' },
  center: { alignItems: 'center', justifyContent: 'center', flex: 1 },

  captureWrap: { width: SCREEN_WIDTH },
  slide: { width: SCREEN_WIDTH, flex: 1 },
  slideSafe: { flex: 1 },

  // Brand watermark (captured into every shared image)
  brandMark: {
    position: 'absolute',
    bottom: spacing[6],
    left: spacing[6],
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[1],
    opacity: 0.9,
  },
  brandDot: { fontSize: 13, lineHeight: 17 },
  brandWord: { fontSize: 15, fontWeight: '900', color: colors.white, letterSpacing: 1 },
  brandHandle: { fontSize: 12, color: 'rgba(255,255,255,0.65)', marginLeft: spacing[1] },

  // Tap zones (edges navigate; middle stays free for swipe & content taps)
  tapLeft: { position: 'absolute', left: 0, top: 96, bottom: 104, width: '26%' },
  tapRight: { position: 'absolute', right: 0, top: 96, bottom: 104, width: '26%' },

  // Summary collage — photos fully visible (no flat colour overlay)
  collage: { ...StyleSheet.absoluteFillObject },
  collageGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  collageCell: { width: '33.34%', height: '33.34%' },

  // Summary (final) card — dark glass so text stays readable over vivid photos
  summaryCard: {
    width: '100%',
    backgroundColor: 'rgba(15,10,10,0.62)',
    borderRadius: radius['2xl'],
    padding: spacing[5],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.28)',
    marginTop: spacing[4],
  },
  summaryBrand: { color: colors.white, fontSize: 20, fontWeight: '800', marginBottom: spacing[4] },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryStat: { width: '50%', marginBottom: spacing[4] },
  summaryStatValue: { color: colors.white, fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1 },
  summaryStatLabel: { color: colors.whiteTransparent80, fontSize: 13 },
  summaryLine: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.2)',
  },
  summaryLineLabel: { color: colors.whiteTransparent80, fontSize: 13 },
  summaryLineValue: { color: colors.white, fontSize: 15, fontWeight: '700', flex: 1, textAlign: 'right', marginLeft: spacing[3] },
  summaryCitiesValue: { textAlign: 'right', flexShrink: 1, maxWidth: '65%' },
  summaryHandle: { color: colors.whiteTransparent80, fontSize: 12, marginTop: spacing[3], textAlign: 'center' },

  // Summary card — top 3 spots (Beli-style ranked list)
  summaryTop3: { paddingTop: spacing[2], borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.2)', marginTop: spacing[1] },
  summaryRankRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[2] },
  summaryRankNum: { color: colors.whiteTransparent80, fontSize: 14, fontWeight: '800', width: 20 },
  summaryRankName: { color: colors.white, fontSize: 15, fontWeight: '700', flex: 1, marginRight: spacing[2] },
  summaryRankScore: { color: colors.white, fontSize: 14, fontWeight: '800' },

  // Category slide — top 3 categories list
  catList: { marginTop: spacing[8], width: 300, maxWidth: '100%', gap: spacing[3] },
  catListRow: { flexDirection: 'row', alignItems: 'center' },
  catListRank: { color: colors.whiteTransparent80, fontSize: 16, fontWeight: '800', width: 26 },
  catListEmoji: { fontSize: 22, lineHeight: 28, marginRight: spacing[3] },
  catListName: { color: colors.white, fontSize: 17, fontWeight: '700', flex: 1 },
  catListCount: { color: colors.whiteTransparent80, fontSize: 14, fontWeight: '700' },

  // Locked state
  lockBadge: {
    width: 76, height: 76, borderRadius: 38,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  lockBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderRadius: radius.full,
    paddingVertical: spacing[4], paddingHorizontal: spacing[6], marginTop: spacing[6],
  },

  // Top spots
  topSpotRow: { flexDirection: 'row', alignItems: 'center' },
  topSpotRank: { fontSize: 22, fontWeight: '900', color: colors.whiteTransparent80, width: 22, textAlign: 'center' },
  topSpotThumb: { width: 52, height: 52, borderRadius: radius.lg, marginLeft: spacing[2], backgroundColor: 'rgba(255,255,255,0.15)' },
  topSpotThumbFallback: { alignItems: 'center', justifyContent: 'center' },
  topSpotScore: { minWidth: 44, height: 44, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[2] },
  topSpotScoreText: { color: colors.white, fontSize: 18, fontWeight: '800' },

  // By-the-numbers grid
  numbersGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing[4] },
  numberStat: { width: '33.34%', alignItems: 'center', marginVertical: spacing[3] },
  numberStatValue: { color: colors.white, fontSize: 40, lineHeight: 44, fontWeight: '900', letterSpacing: -1.5 },
  numberStatLabel: { color: colors.whiteTransparent80, fontSize: 12, marginTop: 2, textAlign: 'center' },
  slideContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  slideContentTight: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },

  bigEmoji: { fontSize: 72, lineHeight: 84, marginBottom: spacing[4], textAlign: 'center' },
  kicker: {
    color: colors.whiteTransparent80,
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 2,
    marginBottom: spacing[3],
  },
  introTitle: {
    color: colors.white,
    fontSize: 40,
    lineHeight: 46,
    fontWeight: '900',
    letterSpacing: -1,
    textAlign: 'center',
  },

  statLabelTop: { color: colors.whiteTransparent90, fontSize: 20, fontWeight: '600' },
  bigStatRow: { flexDirection: 'row', alignItems: 'flex-end', marginTop: spacing[1] },
  bigNumber: { color: colors.white, fontSize: 96, lineHeight: 100, fontWeight: '900', letterSpacing: -3 },
  bigStatUnit: { color: colors.white, fontSize: 26, fontWeight: '700', marginLeft: spacing[3], marginBottom: spacing[3] },
  avgRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[4], gap: spacing[3] },
  avgText: { color: colors.white, fontSize: 16, fontWeight: '600' },

  // Top restaurant card
  topCard: {
    width: '100%',
    height: 380,
    borderRadius: radius['2xl'],
    overflow: 'hidden',
    marginTop: spacing[4],
    backgroundColor: 'rgba(0,0,0,0.2)',
  },
  topPhoto: { width: '100%', height: '100%' },
  topPhotoFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.25)' },
  topPhotoGradient: { position: 'absolute', bottom: 0, left: 0, right: 0, height: '60%' },
  topCardInfo: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: spacing[5] },
  topCardMeta: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[2] },
  topRatingPill: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.45)',
    paddingHorizontal: spacing[2], paddingVertical: 3, borderRadius: radius.sm,
  },
  topRatingText: { color: colors.white, fontSize: 15, fontWeight: '800', marginLeft: 4 },

  categoryName: {
    color: colors.white, fontSize: 40, lineHeight: 46, fontWeight: '900',
    letterSpacing: -1, marginTop: spacing[1], textAlign: 'center',
  },

  // Explorer
  explorerRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[4], justifyContent: 'center' },
  explorerStat: { flex: 1, alignItems: 'center' },
  explorerDivider: { width: StyleSheet.hairlineWidth, height: 64, backgroundColor: colors.whiteTransparent80 },
  explorerNum: { color: colors.white, fontSize: 56, lineHeight: 60, fontWeight: '900', letterSpacing: -2 },
  cityChips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[2], justifyContent: 'center', marginTop: spacing[8] },
  cityChip: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: spacing[3], paddingVertical: spacing[1],
    borderRadius: radius.full, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
  },

  // Chrome
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingTop: spacing[2],
  },
  dots: { flex: 1, flexDirection: 'row', gap: spacing[1], alignItems: 'center' },
  dot: { flex: 1, height: 3, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.3)' },
  dotActive: { backgroundColor: colors.white },
  topBarBtn: { marginLeft: spacing[3], padding: spacing[1] },

  bottomBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    alignItems: 'center', paddingBottom: spacing[4], paddingHorizontal: spacing[6],
  },
  nextBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center',
  },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderRadius: radius.full,
    paddingVertical: spacing[4], paddingHorizontal: spacing[8], width: '100%',
  },
  emptyBtn: {
    marginTop: spacing[6], backgroundColor: colors.white,
    borderRadius: radius.full, paddingVertical: spacing[3], paddingHorizontal: spacing[8],
  },
});
