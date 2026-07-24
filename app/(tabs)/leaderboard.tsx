import React, { useState } from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Modal, ScrollView,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { useSettingsStore } from '@/stores/settingsStore';
import { getLeaderboard, getFriendsLeaderboard, getSchoolLeaderboard } from '@/services/leaderboard';
import { MALAYSIA_CITIES, TASTE_PROFILE_LABELS } from '@/types';
import type { LeaderboardPeriod, LeaderboardEntry } from '@/services/leaderboard';

type Scope = 'city' | 'friends' | 'school';

const PERIODS: { key: LeaderboardPeriod; label: string }[] = [
  { key: 'weekly', label: 'This Week' },
  { key: 'monthly', label: 'This Month' },
  { key: 'alltime', label: 'All Time' },
];

const MEDAL = ['🥇', '🥈', '🥉'] as const;
const MEDAL_COLORS = ['#F4B942', '#9CA3AF', '#CD7F32'];

export default function LeaderboardScreen() {
  const { profile } = useAuthStore();
  const { selectedCity } = useSettingsStore();
  const insets = useSafeAreaInsets();

  const [scope, setScope] = useState<Scope>('city');
  const [period, setPeriod] = useState<LeaderboardPeriod>('alltime');
  const [city, setCity] = useState(profile?.city ?? selectedCity ?? 'Kuala Lumpur');
  const [picker, setPicker] = useState<null | 'city' | 'period'>(null);

  const school = profile?.school ?? null;
  const { data: entries = [], isLoading } = useQuery({
    queryKey: ['leaderboard', scope, city, period, school, profile?.id],
    queryFn: () => {
      if (scope === 'friends' && profile) return getFriendsLeaderboard(profile.id, period);
      if (scope === 'school') return school ? getSchoolLeaderboard(school, period) : Promise.resolve([]);
      return getLeaderboard(city, period);
    },
    staleTime: 1000 * 60 * 5,
  });

  const myIndex = profile ? entries.findIndex(e => e.id === profile.id) : -1;
  const myEntry = myIndex >= 0 ? entries[myIndex] : null;

  const showCityPicker = () => setPicker('city');
  const showPeriodPicker = () => setPicker('period');

  const currentPeriodLabel = PERIODS.find(p => p.key === period)?.label ?? 'All Time';

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 44) }]}>
        <View style={styles.titleRow}>
          <RText style={{ fontSize: 22, lineHeight: 30 }}>🏆</RText>
          <RText style={styles.title}>Leaderboard</RText>
        </View>
      </View>

      {/* Scope tabs */}
      <View style={styles.scopeRow}>
        <TouchableOpacity
          style={[styles.scopeTab, scope === 'city' && styles.scopeTabActive]}
          onPress={() => setScope('city')}
        >
          <Ionicons
            name="location"
            size={14}
            color={scope === 'city' ? colors.white : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <RText variant="labelMedium" color={scope === 'city' ? colors.white : colors.textSecondary}>
            City
          </RText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeTab, scope === 'friends' && styles.scopeTabActive]}
          onPress={() => setScope('friends')}
        >
          <Ionicons
            name="people"
            size={14}
            color={scope === 'friends' ? colors.white : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <RText variant="labelMedium" color={scope === 'friends' ? colors.white : colors.textSecondary}>
            Friends
          </RText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.scopeTab, scope === 'school' && styles.scopeTabActive]}
          onPress={() => setScope('school')}
        >
          <Ionicons
            name="school"
            size={14}
            color={scope === 'school' ? colors.white : colors.textSecondary}
            style={{ marginRight: 4 }}
          />
          <RText variant="labelMedium" color={scope === 'school' ? colors.white : colors.textSecondary}>
            School
          </RText>
        </TouchableOpacity>
      </View>

      {/* Dropdowns */}
      <View style={styles.dropdownRow}>
        {scope === 'city' && (
          <TouchableOpacity style={styles.dropdown} onPress={showCityPicker}>
            <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
            <RText variant="labelMedium" color={colors.textPrimary} style={styles.dropdownText} numberOfLines={1}>
              {city}
            </RText>
            <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
        {scope === 'friends' && (
          <View style={styles.friendsHint}>
            <Ionicons name="people-outline" size={14} color={colors.textSecondary} />
            <Caption color={colors.textSecondary} style={{ marginLeft: spacing[2] }}>
              Among people you follow
            </Caption>
          </View>
        )}
        {scope === 'school' && school && (
          <View style={styles.friendsHint}>
            <Ionicons name="school-outline" size={14} color={colors.textSecondary} />
            <Caption color={colors.textSecondary} style={{ marginLeft: spacing[2] }} numberOfLines={1}>
              {school}
            </Caption>
          </View>
        )}
        <TouchableOpacity style={styles.dropdown} onPress={showPeriodPicker}>
          <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
          <RText variant="labelMedium" color={colors.textPrimary} style={styles.dropdownText}>
            {currentPeriodLabel}
          </RText>
          <Ionicons name="chevron-down" size={14} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>

      {scope === 'school' && !school ? (
        <View style={styles.emptyState}>
          <RText style={{ fontSize: 48, lineHeight: 58 }}>🎓</RText>
          <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>Join your campus board</RText>
          <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 280 }}>
            Add your school to see how you rank against fellow students and compete for the top spot.
          </Caption>
          <TouchableOpacity style={styles.addSchoolBtn} onPress={() => router.push('/edit-profile')} activeOpacity={0.9}>
            <Ionicons name="school-outline" size={16} color={colors.white} />
            <RText variant="labelMedium" color={colors.white} style={{ marginLeft: 6 }}>Add your school</RText>
          </TouchableOpacity>
        </View>
      ) : isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : entries.length === 0 ? (
        <View style={styles.emptyState}>
          <RText style={{ fontSize: 48, lineHeight: 58 }}>🍽️</RText>
          <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>
            {scope === 'friends' ? 'No friends yet' : scope === 'school' ? 'No reviewers yet' : 'No reviewers yet'}
          </RText>
          <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 260 }}>
            {scope === 'friends'
              ? 'Follow food lovers to see how you compare!'
              : scope === 'school'
                ? `Be the first at ${school} to review!`
                : `Be the first to review in ${city}!`}
          </Caption>
        </View>
      ) : (
        <FlatList
          data={entries}
          keyExtractor={e => e.id}
          renderItem={({ item }) => (
            <LeaderboardRow entry={item} isCurrentUser={item.id === profile?.id} />
          )}
          ListFooterComponent={
            myEntry && myIndex >= 0 ? (
              <View style={styles.myRankFooter}>
                <View style={styles.myRankInner}>
                  <RText style={[styles.footerRank, { color: myIndex < 3 ? MEDAL_COLORS[myIndex] : colors.primary }]}>
                    {myIndex < 3 ? MEDAL[myIndex as 0 | 1 | 2] : `#${myEntry.rank}`}
                  </RText>
                  <Avatar uri={myEntry.avatar_url} name={myEntry.display_name} size="sm" />
                  <RText variant="titleSmall" style={{ marginLeft: spacing[2], flex: 1 }}>
                    Your rank
                  </RText>
                  <View style={styles.scoreBox}>
                    <RText variant="titleSmall" color={colors.primary}>{myEntry.review_count}</RText>
                    <Caption color={colors.textSecondary}> reviews</Caption>
                  </View>
                </View>
              </View>
            ) : null
          }
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Custom picker sheet (replaces ActionSheetIOS / Alert) */}
      <Modal visible={picker !== null} transparent animationType="fade" onRequestClose={() => setPicker(null)}>
        <TouchableOpacity style={styles.pickerOverlay} activeOpacity={1} onPress={() => setPicker(null)}>
          <View style={styles.pickerSheet}>
            <View style={styles.pickerHandle} />
            <RText variant="titleMedium" style={{ marginBottom: spacing[3], paddingHorizontal: spacing[4] }}>
              {picker === 'city' ? 'Select City' : 'Select Period'}
            </RText>
            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {picker === 'city'
                ? MALAYSIA_CITIES.map(c => (
                    <PickerRow key={c} label={c} selected={c === city} onPress={() => { setCity(c); setPicker(null); }} />
                  ))
                : PERIODS.map(p => (
                    <PickerRow key={p.key} label={p.label} selected={p.key === period} onPress={() => { setPeriod(p.key); setPicker(null); }} />
                  ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

function LeaderboardRow({ entry, isCurrentUser }: { entry: LeaderboardEntry; isCurrentUser: boolean }) {
  const tasteProfile = entry.taste_profile ? TASTE_PROFILE_LABELS[entry.taste_profile] : null;
  const isMedal = entry.rank <= 3;
  const rankColor = isMedal ? MEDAL_COLORS[entry.rank - 1] : colors.textTertiary;

  return (
    <TouchableOpacity
      style={[styles.row, isCurrentUser && styles.rowMe]}
      onPress={() => router.push(`/user/${entry.username}`)}
      activeOpacity={0.8}
    >
      {/* Rank */}
      <View style={styles.rankBox}>
        {isMedal ? (
          <RText style={{ fontSize: 22, lineHeight: 28 }}>{MEDAL[entry.rank - 1 as 0 | 1 | 2]}</RText>
        ) : (
          <RText style={[styles.rankNum, { color: rankColor }]}>#{entry.rank}</RText>
        )}
      </View>

      <Avatar uri={entry.avatar_url} name={entry.display_name} size="md" />

      <View style={styles.rowInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <RText variant="titleSmall" numberOfLines={1} style={{ flex: 1 }}>
            {entry.display_name}
          </RText>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing[2] }}>
          <Caption color={colors.textTertiary}>@{entry.username}</Caption>
          {tasteProfile && (
            <Caption color={colors.primary}>{tasteProfile.emoji}</Caption>
          )}
        </View>
      </View>

      <View style={styles.scoreBox}>
        <RText variant="stat" color={isCurrentUser ? colors.primary : colors.textPrimary}>
          {entry.review_count}
        </RText>
        <Caption color={colors.textSecondary}>reviews</Caption>
      </View>
    </TouchableOpacity>
  );
}

function PickerRow({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <TouchableOpacity style={styles.pickerRow} onPress={onPress} activeOpacity={0.7}>
      <RText variant="bodyLarge" color={selected ? colors.primary : colors.textPrimary} style={{ fontWeight: selected ? '700' : '400' }}>
        {label}
      </RText>
      {selected && <Ionicons name="checkmark" size={20} color={colors.primary} />}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },

  // Podium
  podium: {
    paddingTop: spacing[5],
    paddingBottom: spacing[4],
    paddingHorizontal: spacing[4],
    marginBottom: spacing[2],
  },
  podiumRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: spacing[3],
  },
  podiumCol: { flex: 1, alignItems: 'center' },
  podiumColFirst: { marginBottom: 0 },
  crown: { fontSize: 22, lineHeight: 26, marginBottom: 2 },
  podiumAvatarWrap: {
    borderWidth: 3,
    borderRadius: radius.full,
    padding: 2,
    position: 'relative',
  },
  podiumMedal: {
    position: 'absolute',
    bottom: -6,
    alignSelf: 'center',
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.white,
  },
  podiumMedalText: { color: colors.white, fontSize: 11, fontWeight: '800', lineHeight: 14 },
  podiumName: { marginTop: spacing[3], maxWidth: 90 },
  pedestal: {
    marginTop: spacing[2],
    width: '100%',
    borderTopLeftRadius: radius.md,
    borderTopRightRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...(shadows.sm as object),
  },
  pedestalScore: { color: colors.white, fontSize: 18, fontWeight: '800', lineHeight: 22 },
  pedestalLabel: { color: colors.whiteTransparent80, fontSize: 10, lineHeight: 13 },


  header: {
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2] },
  title: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },

  scopeRow: {
    flexDirection: 'row',
    margin: spacing[4],
    backgroundColor: colors.gray100,
    borderRadius: radius.full,
    padding: 3,
  },
  scopeTab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  scopeTabActive: { backgroundColor: colors.textPrimary },

  dropdownRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    paddingBottom: spacing[3],
    gap: spacing[3],
    alignItems: 'center',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
    gap: spacing[2],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    flex: 1,
  },
  dropdownText: { flex: 1 },
  friendsHint: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: spacing[2],
  },

  addSchoolBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: 999,
    paddingHorizontal: spacing[5],
    paddingVertical: spacing[3],
    marginTop: spacing[5],
  },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },

  list: { paddingBottom: spacing[24] },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
    backgroundColor: colors.background,
  },
  rowMe: { backgroundColor: colors.primarySurface },

  rankBox: { width: 36, alignItems: 'center' },
  rankNum: { fontSize: 15, fontWeight: '800' },

  rowInfo: { flex: 1 },
  scoreBox: { alignItems: 'center', flexDirection: 'row' },
  youBadge: {
    paddingHorizontal: spacing[2],
    paddingVertical: 3,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },

  myRankFooter: {
    marginTop: spacing[4],
    marginHorizontal: spacing[4],
    marginBottom: spacing[8],
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    overflow: 'hidden',
  },
  myRankInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.primarySurface,
    gap: spacing[3],
  },
  footerRank: { fontSize: 22, lineHeight: 28, width: 36, textAlign: 'center' },

  // Picker sheet
  pickerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  pickerSheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    paddingTop: spacing[3],
    paddingBottom: spacing[10],
  },
  pickerHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: colors.gray300, alignSelf: 'center', marginBottom: spacing[4],
  },
  pickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[5],
  },
});
