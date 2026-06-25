import React from 'react';
import { View, ScrollView, TouchableOpacity, StyleSheet, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { StarRating } from '@/components/ui/StarRating';
import type { RecommendationResult } from '@/services/recommendations';
import type { Restaurant } from '@/types';
import { PRICE_LABELS } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = SCREEN_WIDTH * 0.72;

// ─── Single recommendation card ───────────────────────────────

interface RecommendationCardProps {
  rec: RecommendationResult;
  onDismiss?: () => void;
}

export function RecommendationCard({ rec, onDismiss }: RecommendationCardProps) {
  const { restaurant } = rec;

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      activeOpacity={0.9}
    >
      {/* Photo */}
      {restaurant.cover_photo_url ? (
        <Image
          source={{ uri: restaurant.cover_photo_url }}
          style={styles.photo}
          contentFit="cover"
          transition={300}
        />
      ) : (
        <View style={[styles.photo, styles.photoFallback]}>
          <RText style={{ fontSize: 48 }}>🍜</RText>
        </View>
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.85)']}
        style={styles.gradient}
      />

      {/* Dismiss */}
      {onDismiss && (
        <TouchableOpacity style={styles.dismissBtn} onPress={onDismiss} hitSlop={8}>
          <Ionicons name="close" size={14} color={colors.white} />
        </TouchableOpacity>
      )}

      {/* Halal badge */}
      {restaurant.dietary_options?.includes('halal_certified') && (
        <View style={styles.halalBadge}>
          <RText style={{ fontSize: 9, fontWeight: '800', color: colors.white }}>HALAL</RText>
        </View>
      )}

      {/* Content */}
      <View style={styles.content}>
        {/* Reason pill */}
        <View style={styles.reasonPill}>
          <RText style={{ fontSize: 11, color: colors.white, fontWeight: '700' }}>
            {rec.reason_label}
          </RText>
        </View>

        <RText variant="titleLarge" color={colors.white} numberOfLines={2}>
          {restaurant.name}
        </RText>

        <View style={styles.metaRow}>
          <StarRating value={restaurant.overall_rating} size={13} readonly compact color={colors.accent} />
          <Caption color="rgba(255,255,255,0.7)" style={{ marginLeft: spacing[2] }}>
            {restaurant.overall_rating.toFixed(1)}
          </Caption>
          <Caption color="rgba(255,255,255,0.5)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
          <Caption color="rgba(255,255,255,0.7)">
            {restaurant.area ?? restaurant.city}
          </Caption>
          <Caption color="rgba(255,255,255,0.5)" style={{ marginHorizontal: spacing[2] }}>·</Caption>
          <Caption color="rgba(255,255,255,0.7)">{restaurant.price_range}</Caption>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── For You section (full section with header) ───────────────

interface ForYouSectionProps {
  recs: RecommendationResult[];
  onDismiss?: (restaurantId: string) => void;
}

export function ForYouSection({ recs, onDismiss }: ForYouSectionProps) {
  if (recs.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <RText variant="h4">For You</RText>
          <Caption>Based on your taste profile</Caption>
        </View>
        <TouchableOpacity onPress={() => router.push('/(tabs)/explore')}>
          <Caption color={colors.primary}>See all</Caption>
        </TouchableOpacity>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
        decelerationRate="fast"
        snapToInterval={CARD_WIDTH + spacing[4]}
        snapToAlignment="start"
      >
        {recs.map(rec => (
          <RecommendationCard
            key={rec.restaurant.id}
            rec={rec}
            onDismiss={onDismiss ? () => onDismiss(rec.restaurant.id) : undefined}
          />
        ))}
      </ScrollView>
    </View>
  );
}

// ─── Trending section (no score, just popular in city) ────────

interface TrendingSectionProps {
  title: string;
  subtitle?: string;
  restaurants: Restaurant[];
}

export function TrendingSection({ title, subtitle, restaurants }: TrendingSectionProps) {
  if (restaurants.length === 0) return null;

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View>
          <RText variant="h4">{title}</RText>
          {subtitle && <Caption>{subtitle}</Caption>}
        </View>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollRow}
      >
        {restaurants.map(r => (
          <TrendingCard key={r.id} restaurant={r} />
        ))}
      </ScrollView>
    </View>
  );
}

function TrendingCard({ restaurant }: { restaurant: Restaurant }) {
  return (
    <TouchableOpacity
      style={styles.trendingCard}
      onPress={() => router.push(`/restaurant/${restaurant.id}`)}
      activeOpacity={0.88}
    >
      {restaurant.cover_photo_url ? (
        <Image source={{ uri: restaurant.cover_photo_url }} style={styles.trendingPhoto} contentFit="cover" transition={200} />
      ) : (
        <View style={[styles.trendingPhoto, styles.photoFallback]}>
          <RText style={{ fontSize: 32 }}>🍴</RText>
        </View>
      )}
      <LinearGradient colors={['transparent', 'rgba(0,0,0,0.7)']} style={styles.trendingGradient} />

      {restaurant.dietary_options?.includes('halal_certified') && (
        <View style={[styles.halalBadge, styles.trendingHalal]}>
          <RText style={{ fontSize: 9, fontWeight: '800', color: colors.white }}>HALAL</RText>
        </View>
      )}

      <View style={styles.trendingContent}>
        <RText variant="titleSmall" color={colors.white} numberOfLines={1}>{restaurant.name}</RText>
        <View style={styles.trendingMeta}>
          <Caption color="rgba(255,255,255,0.8)">⭐ {restaurant.overall_rating.toFixed(1)}</Caption>
          <Caption color="rgba(255,255,255,0.6)" style={{ marginLeft: spacing[2] }}>
            {restaurant.price_range}
          </Caption>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  // For You card
  card: {
    width: CARD_WIDTH,
    height: 220,
    borderRadius: radius.xl,
    overflow: 'hidden',
    position: 'relative',
    marginRight: spacing[4],
    ...(shadows.lg as object),
  },
  photo: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  photoFallback: {
    backgroundColor: colors.gray100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '75%',
  },
  dismissBtn: {
    position: 'absolute',
    top: spacing[3],
    right: spacing[3],
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  halalBadge: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    backgroundColor: colors.halal,
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
  },
  content: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[4],
    gap: spacing[2],
  },
  reasonPill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  // Section
  section: {
    paddingBottom: spacing[4],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: spacing[4],
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
  },
  scrollRow: {
    paddingHorizontal: spacing[4],
  },

  // Trending card
  trendingCard: {
    width: 160,
    height: 180,
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginRight: spacing[3],
    position: 'relative',
    ...(shadows.sm as object),
  },
  trendingPhoto: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  trendingGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '60%',
  },
  trendingHalal: {
    top: spacing[2],
    left: spacing[2],
  },
  trendingContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: spacing[3],
    gap: 2,
  },
  trendingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
  },
});
