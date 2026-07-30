import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { RestaurantCard } from '@/components/restaurants/RestaurantCard';
import { RestaurantCardSkeleton } from '@/components/restaurants/RestaurantCardSkeleton';
import { useAuthStore } from '@/stores/authStore';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useReviewedRestaurantIds } from '@/hooks/useReviewedRestaurants';
import { useSettingsStore } from '@/stores/settingsStore';
import { getRecommendations } from '@/services/recommendations';
import { getNearbyRestaurants } from '@/services/restaurants';
import { formatDistance } from '@/lib/geo';

// Keep recs Beli "want-to-try" sized — enough to browse, not an endless wall.
const REC_LIMIT = 20;

type Mode = 'taste' | 'nearby';
const RADII = [2, 5, 10] as const;

/**
 * Beli-style Recommendations — places picked for you, sortable by Taste Match
 * (the recommendation engine) or Nearby (distance). Replaces the old Near Me.
 */
export default function RecommendationsScreen() {
  const { profile } = useAuthStore();
  const { halalOnly } = useSettingsStore();
  const location = useUserLocation();
  const [mode, setMode] = useState<Mode>('taste');
  const [radiusKm, setRadiusKm] = useState<number>(5);

  const coords = location.coords;

  const { data: tasteRecs, isLoading: tasteLoading } = useQuery({
    queryKey: ['recommendations', profile?.id],
    queryFn: () => getRecommendations(profile!.id, REC_LIMIT),
    enabled: !!profile && mode === 'taste',
  });

  const { data: nearby, isLoading: nearbyLoading } = useQuery({
    queryKey: ['recNearby', coords?.lat, coords?.lng, radiusKm, halalOnly],
    queryFn: () => getNearbyRestaurants(coords!.lat, coords!.lng, { radiusKm, halalOnly, limit: REC_LIMIT }),
    enabled: mode === 'nearby' && !!coords,
  });

  const switchMode = (m: Mode) => {
    setMode(m);
    if (m === 'nearby') location.request();
  };

  // Never recommend a place the user has already reviewed.
  const reviewedIds = useReviewedRestaurantIds();
  const tasteList = (tasteRecs ?? []).filter(rec => !reviewedIds.has(rec.restaurant.id));
  const nearbyList = (nearby ?? []).filter(r => !reviewedIds.has(r.id));

  const loading = mode === 'taste' ? tasteLoading : nearbyLoading;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="h4">For You</RText>
        <View style={{ width: 26 }} />
      </View>

      {/* Mode toggle */}
      <View style={styles.modeRow}>
        <ModeChip label="Taste Match" icon="sparkles" active={mode === 'taste'} onPress={() => switchMode('taste')} />
        <ModeChip label="Nearby" icon="navigate" active={mode === 'nearby'} onPress={() => switchMode('nearby')} />
      </View>

      {mode === 'nearby' && (
        <View style={styles.radiusRow}>
          {RADII.map(r => (
            <TouchableOpacity
              key={r}
              style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
              onPress={() => setRadiusKm(r)}
            >
              <RText variant="labelSmall" color={radiusKm === r ? colors.white : colors.textSecondary}>
                {r} km
              </RText>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {loading ? (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {Array.from({ length: 6 }).map((_, i) => (
            <View key={`sk-${i}`} style={styles.cardWrap}><RestaurantCardSkeleton /></View>
          ))}
        </ScrollView>
      ) : mode === 'nearby' && !coords ? (
        <EmptyState icon="location-outline" title="Enable location" subtitle="Allow location access to see places near you." />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {mode === 'taste' ? (
            tasteList.length === 0 ? (
              <EmptyState icon="sparkles-outline" title="No picks yet" subtitle="Rate a few places and we'll learn your taste." />
            ) : (
              tasteList.map(rec => (
                <View key={rec.restaurant.id} style={styles.cardWrap}>
                  <RestaurantCard
                    restaurant={rec.restaurant}
                    distance={formatDistance(coords, rec.restaurant.latitude, rec.restaurant.longitude)}
                  />
                </View>
              ))
            )
          ) : (
            nearbyList.length === 0 ? (
              <EmptyState icon="navigate-outline" title="Nothing new within range" subtitle="Try a bigger radius." />
            ) : (
              nearbyList.map(r => (
                <View key={r.id} style={styles.cardWrap}>
                  <RestaurantCard
                    restaurant={r}
                    distance={formatDistance(coords, r.latitude, r.longitude)}
                  />
                </View>
              ))
            )
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

function ModeChip({ label, icon, active, onPress }: {
  label: string; icon: keyof typeof Ionicons.glyphMap; active: boolean; onPress: () => void;
}) {
  return (
    <TouchableOpacity style={[styles.modeChip, active && styles.modeChipActive]} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={15} color={active ? colors.white : colors.textSecondary} />
      <RText variant="labelMedium" color={active ? colors.white : colors.textSecondary} style={{ marginLeft: 6 }}>
        {label}
      </RText>
    </TouchableOpacity>
  );
}

function EmptyState({ icon, title, subtitle }: { icon: keyof typeof Ionicons.glyphMap; title: string; subtitle: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name={icon} size={40} color={colors.textTertiary} />
      <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>{title}</RText>
      <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[1], maxWidth: 260 }}>{subtitle}</Caption>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  modeRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  modeChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: spacing[4], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  modeChipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  radiusRow: { flexDirection: 'row', gap: spacing[2], paddingHorizontal: spacing[4], paddingBottom: spacing[3] },
  radiusChip: {
    paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    borderRadius: radius.full, borderWidth: 1, borderColor: colors.border,
  },
  radiusChipActive: { backgroundColor: colors.textPrimary, borderColor: colors.textPrimary },
  list: { paddingHorizontal: spacing[4], paddingBottom: spacing[16] },
  cardWrap: { marginBottom: spacing[4], position: 'relative' },
  distanceTag: {
    position: 'absolute', top: spacing[3], left: spacing[3],
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.white, borderRadius: 999,
    paddingHorizontal: spacing[2], paddingVertical: 3,
  },
  empty: { alignItems: 'center', paddingTop: spacing[16], paddingHorizontal: spacing[6] },
});
