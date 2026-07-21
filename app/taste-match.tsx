import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { TasteMatchCard } from '@/components/users/TasteMatchBadge';
import { useAuthStore } from '@/stores/authStore';
import { getTasteMatches } from '@/services/users';
import { queryKeys } from '@/lib/queryClient';

export default function TasteMatchScreen() {
  const { profile } = useAuthStore();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: queryKeys.userTasteMatches(profile?.id ?? ''),
    queryFn: () => getTasteMatches(profile!.id, 30),
    enabled: !!profile,
    staleTime: 1000 * 60 * 10,
  });

  return (
    <View style={styles.container}>
      {/* Hero header */}
      <LinearGradient colors={[colors.primary, colors.primaryDark]} style={styles.hero}>
        <SafeAreaView edges={['top']}>
          <View style={styles.navBar}>
            <TouchableOpacity onPress={() => router.back()} style={styles.navBtn} hitSlop={8}>
              <Ionicons name="chevron-back" size={24} color={colors.white} />
            </TouchableOpacity>
          </View>
          <View style={styles.heroContent}>
            <RText style={{ fontSize: 40, lineHeight: 48 }}>🧬</RText>
            <RText variant="h2" color={colors.white} style={{ marginTop: spacing[2] }}>Taste Matches</RText>
            <Caption color={colors.whiteTransparent90} style={{ marginTop: spacing[1], maxWidth: 300 }}>
              People whose ratings line up with yours — the higher the %, the more you'll trust their picks.
            </Caption>
          </View>
        </SafeAreaView>
      </LinearGradient>

      {isLoading ? (
        <View style={styles.loading}><ActivityIndicator color={colors.primary} /></View>
      ) : matches.length === 0 ? (
        <View style={styles.empty}>
          <RText style={{ fontSize: 44, lineHeight: 54 }}>🍽️</RText>
          <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No matches yet</RText>
          <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 280 }}>
            Rate more restaurants and follow food lovers — we'll surface the people who share your taste.
          </Caption>
          <TouchableOpacity style={styles.cta} onPress={() => router.push('/(tabs)/explore')} activeOpacity={0.9}>
            <RText variant="labelMedium" color={colors.white}>Find people to follow</RText>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.list}>
          {matches.map(match => (
            <TasteMatchCard
              key={match.user.id}
              match={match}
              currentUserName={profile?.display_name}
              onPress={() => router.push(`/user/${match.user.username}`)}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  hero: { paddingBottom: spacing[6] },
  navBar: { paddingHorizontal: spacing[4], paddingTop: spacing[2] },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'flex-start', justifyContent: 'center' },
  heroContent: { paddingHorizontal: spacing[5], paddingTop: spacing[2] },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing[4], paddingBottom: spacing[16] },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[8] },
  cta: {
    marginTop: spacing[5],
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[6],
    paddingVertical: spacing[3],
  },
});
