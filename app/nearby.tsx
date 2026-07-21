import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { SavedRestaurantCard } from '@/components/profile/SavedRestaurantCard';
import { useUserLocation } from '@/hooks/useUserLocation';
import { useSettingsStore } from '@/stores/settingsStore';
import { getNearbyRestaurants } from '@/services/restaurants';
import { formatDistance } from '@/lib/geo';

const RADII = [2, 5, 10] as const;

export default function NearbyScreen() {
  const { halalOnly } = useSettingsStore();
  const location = useUserLocation();
  const [radiusKm, setRadiusKm] = useState<number>(5);

  // Ask for location as soon as the screen opens.
  useEffect(() => { location.request(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const coords = location.coords;

  const { data: restaurants, isLoading } = useQuery({
    queryKey: ['nearby', coords?.lat, coords?.lng, radiusKm, halalOnly],
    queryFn: () => getNearbyRestaurants(coords!.lat, coords!.lng, { radiusKm, halalOnly }),
    enabled: !!coords,
    staleTime: 1000 * 60,
  });

  return (
    <View style={styles.container}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} hitSlop={8}>
          <Ionicons name="chevron-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <RText variant="h3">Near Me</RText>
          <Caption color={colors.textSecondary}>
            {halalOnly ? 'Halal certified · ' : ''}within {radiusKm} km
          </Caption>
        </View>
      </SafeAreaView>

      {/* Radius selector */}
      <View style={styles.radiusRow}>
        {RADII.map(r => (
          <TouchableOpacity
            key={r}
            style={[styles.radiusChip, radiusKm === r && styles.radiusChipActive]}
            onPress={() => setRadiusKm(r)}
          >
            <RText variant="labelMedium" color={radiusKm === r ? colors.white : colors.textSecondary}>
              {r} km
            </RText>
          </TouchableOpacity>
        ))}
      </View>

      {location.status === 'denied' ? (
        <EmptyState
          emoji="📍"
          title="Location needed"
          body="Enable location access to discover great food around you."
          cta="Try again"
          onCta={() => location.request()}
        />
      ) : !coords || isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
      ) : (restaurants ?? []).length === 0 ? (
        <EmptyState
          emoji="🍽️"
          title="Nothing nearby yet"
          body={`No ${halalOnly ? 'halal ' : ''}spots within ${radiusKm} km — try a wider radius.`}
        />
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {(restaurants ?? []).map(r => (
            <SavedRestaurantCard
              key={r.id}
              restaurant={r}
              distance={formatDistance(coords, r.latitude, r.longitude)}
              showWantChip={false}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

function EmptyState({ emoji, title, body, cta, onCta }: {
  emoji: string; title: string; body: string; cta?: string; onCta?: () => void;
}) {
  return (
    <View style={styles.empty}>
      <RText style={{ fontSize: 44, lineHeight: 54 }}>{emoji}</RText>
      <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>{title}</RText>
      <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 280 }}>
        {body}
      </Caption>
      {cta && onCta && (
        <TouchableOpacity style={styles.ctaBtn} onPress={onCta} activeOpacity={0.9}>
          <RText variant="labelMedium" color={colors.white}>{cta}</RText>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[2],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  backBtn: { padding: spacing[1] },
  radiusRow: { flexDirection: 'row', gap: spacing[2], padding: spacing[4], paddingBottom: spacing[2] },
  radiusChip: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  radiusChipActive: { backgroundColor: colors.secondary },
  list: { paddingHorizontal: spacing[4], paddingTop: spacing[2], paddingBottom: spacing[16], gap: spacing[3] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8] },
  ctaBtn: {
    marginTop: spacing[5],
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
});
