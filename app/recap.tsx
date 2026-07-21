import React, { useState, useRef } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Share, ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import { useAuthStore } from '@/stores/authStore';
import { getMonthlyRecap, type RecapData } from '@/services/recap';
import { CATEGORY_LABELS } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const CATEGORY_EMOJI: Record<string, string> = {
  hawker: '🍜', mamak: '🥛', cafe: '☕', kopitiam: '🍳', fine_dining: '🥂',
  food_court: '🍱', night_market: '🌙', restaurant: '🍽️', fast_food: '🍔', bar: '🍸',
};

// Each slide gets its own warm gradient so swiping feels like a story.
const SLIDE_GRADIENTS: [string, string][] = [
  ['#D94841', '#8B1E1E'],
  ['#E07B39', '#B4801F'],
  ['#6D28D9', '#3B1D8F'],
  ['#4F8A5B', '#1F5C3A'],
  ['#1F2937', '#0B0F17'],
];

export default function RecapScreen() {
  const { profile } = useAuthStore();
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  const { data: recap, isLoading } = useQuery({
    queryKey: ['monthlyRecap', profile?.id],
    queryFn: () => getMonthlyRecap(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 60 * 5,
  });

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

  const slides = buildSlides(recap);

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

  const handleShare = async () => {
    const rating = recap.avgRating ? recap.avgRating.toFixed(1) : '—';
    await Share.share({
      message:
        `My ${recap.monthLabel} on Rasa 🍜\n` +
        `${recap.totalReviews} places rated · ${rating}★ avg\n` +
        (recap.topRestaurant ? `Top spot: ${recap.topRestaurant.name}\n` : '') +
        `Come eat with me on Rasa!`,
    }).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((slide, i) => (
          <Slide key={i} gradient={SLIDE_GRADIENTS[i % SLIDE_GRADIENTS.length]}>
            {slide}
          </Slide>
        ))}
      </ScrollView>

      {/* Progress dots */}
      <SafeAreaView edges={['top']} style={styles.topBar} pointerEvents="box-none">
        <View style={styles.dots}>
          {slides.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
        <TouchableOpacity style={styles.closeBtn} onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={22} color={colors.white} />
        </TouchableOpacity>
      </SafeAreaView>

      {/* Bottom action */}
      <SafeAreaView edges={['bottom']} style={styles.bottomBar} pointerEvents="box-none">
        {index < slides.length - 1 ? (
          <TouchableOpacity style={styles.nextBtn} onPress={goNext} activeOpacity={0.85}>
            <Ionicons name="arrow-forward" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.shareBtn} onPress={handleShare} activeOpacity={0.9}>
            <Ionicons name="share-social" size={18} color={colors.textPrimary} />
            <RText variant="buttonMedium" color={colors.textPrimary} style={{ marginLeft: spacing[2] }}>
              Share my recap
            </RText>
          </TouchableOpacity>
        )}
      </SafeAreaView>
    </View>
  );
}

// ─── Slide shell ──────────────────────────────────────────────

function Slide({ gradient, children }: { gradient: [string, string]; children: React.ReactNode }) {
  return (
    <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.slide}>
      <SafeAreaView style={styles.slideSafe}>{children}</SafeAreaView>
    </LinearGradient>
  );
}

// ─── Slide builders ───────────────────────────────────────────

function buildSlides(recap: RecapData): React.ReactNode[] {
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
            <RText style={styles.explorerNum}>{recap.coinsEarned.toLocaleString()}</RText>
            <Caption color={colors.whiteTransparent80}>🪙 earned</Caption>
          </View>
        </View>
        {recap.cities.length > 0 && (
          <View style={styles.cityChips}>
            {recap.cities.slice(0, 6).map(c => (
              <View key={c} style={styles.cityChip}>
                <RText variant="labelSmall" color={colors.white}>{c}</RText>
              </View>
            ))}
          </View>
        )}
      </Animated.View>
    </View>
  );

  // 6 — Outro
  slides.push(
    <View style={styles.slideContent} key="outro">
      <Animated.View entering={FadeIn.duration(500)} style={styles.center}>
        <RText style={styles.bigEmoji}>✨</RText>
        <RText style={styles.introTitle}>Sedap.</RText>
        <Caption color={colors.whiteTransparent90} align="center" style={{ marginTop: spacing[4], maxWidth: 280 }}>
          That's your {recap.monthLabel} in food. Keep rating — a fresh recap lands every month.
        </Caption>
      </Animated.View>
    </View>
  );

  return slides;
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

  slide: { width: SCREEN_WIDTH, flex: 1 },
  slideSafe: { flex: 1 },
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
  closeBtn: { marginLeft: spacing[4], padding: spacing[1] },

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
