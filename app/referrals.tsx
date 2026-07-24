import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { getReferralAnalytics, type ReferredUser } from '@/services/referrals';
import { shareInvite, copyReferralCode } from '@/lib/referral';
import { track } from '@/lib/analytics';
import { toast } from '@/stores/toastStore';

/**
 * Referral analytics + invite hub. Shows the user's code, headline stats
 * (invited / activated / activation rate / coins), and the list of people they've
 * referred with each one's join date + activation status.
 */
export default function ReferralsScreen() {
  const { profile } = useAuthStore();
  const inviteRef = profile?.referral_code ?? profile?.username;

  const { data, isLoading } = useQuery({
    queryKey: ['referralAnalytics', profile?.id],
    queryFn: () => getReferralAnalytics(profile!.id),
    enabled: !!profile,
  });

  const handleInvite = () => {
    if (inviteRef) { shareInvite(inviteRef); track('referral_shared'); }
  };
  const handleCopy = async () => {
    if (!profile?.referral_code) return;
    await copyReferralCode(profile.referral_code);
    track('referral_code_copied');
    toast.success('Code copied 🎉');
  };

  const ratePct = Math.round((data?.activationRate ?? 0) * 100);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="h4">Referrals</RText>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Invite hero — code + share */}
        <LinearGradient
          colors={['#D94841', '#8B1E1E']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.hero}
        >
          <RText variant="labelSmall" color={colors.whiteTransparent80}>YOUR REFERRAL CODE</RText>
          <TouchableOpacity onPress={handleCopy} activeOpacity={0.8} style={styles.codeRow}>
            <RText style={styles.code}>{profile?.referral_code ?? '—'}</RText>
            <Ionicons name="copy-outline" size={20} color={colors.whiteTransparent80} style={{ marginLeft: spacing[2] }} />
          </TouchableOpacity>
          <Caption color={colors.whiteTransparent80} style={{ marginBottom: spacing[4] }}>
            Friends who join with your code earn you both 🪙
          </Caption>
          <TouchableOpacity style={styles.shareBtn} onPress={handleInvite} activeOpacity={0.9}>
            <Ionicons name="share-social" size={18} color={colors.primary} />
            <RText variant="buttonMedium" color={colors.primary} style={{ marginLeft: spacing[2] }}>
              Share your invite
            </RText>
          </TouchableOpacity>
        </LinearGradient>

        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
        ) : (
          <>
            {/* Stat cards */}
            <View style={styles.statGrid}>
              <StatCard value={String(data?.total ?? 0)} label="Invited" icon="person-add" tint={colors.primary} />
              <StatCard value={String(data?.activated ?? 0)} label="Joined & reviewed" icon="checkmark-circle" tint={colors.success} />
              <StatCard value={`${ratePct}%`} label="Activation rate" icon="trending-up" tint="#3B82F6" />
              <StatCard value={(data?.coinsEarned ?? 0).toLocaleString()} label="Coins earned" icon="server" tint={colors.bookmarked} emoji="🪙" />
            </View>

            {(data?.last7 ?? 0) > 0 && (
              <View style={styles.trendPill}>
                <Ionicons name="flame" size={15} color={colors.primary} />
                <RText variant="labelMedium" color={colors.primary} style={{ marginLeft: 6 }}>
                  {data!.last7} new {data!.last7 === 1 ? 'invite' : 'invites'} in the last 7 days
                </RText>
              </View>
            )}

            {/* People list */}
            <RText variant="h4" style={styles.listTitle}>People you invited</RText>
            {(data?.people.length ?? 0) === 0 ? (
              <View style={styles.empty}>
                <RText style={{ fontSize: 38, lineHeight: 48 }}>👋</RText>
                <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No invites yet</RText>
                <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[1], maxWidth: 260 }}>
                  Share your code above — you'll see everyone who joins here, and when they start reviewing.
                </Caption>
              </View>
            ) : (
              <View style={styles.list}>
                {data!.people.map(p => <ReferredRow key={p.id} person={p} />)}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({
  value, label, icon, tint, emoji,
}: {
  value: string; label: string; icon: keyof typeof Ionicons.glyphMap; tint: string; emoji?: string;
}) {
  return (
    <View style={styles.statCard}>
      <View style={[styles.statIcon, { backgroundColor: tint + '1A' }]}>
        {emoji ? <RText style={{ fontSize: 16, lineHeight: 20 }}>{emoji}</RText>
               : <Ionicons name={icon} size={18} color={tint} />}
      </View>
      <RText variant="stat" style={{ marginTop: spacing[2] }}>{value}</RText>
      <Caption color={colors.textSecondary}>{label}</Caption>
    </View>
  );
}

function ReferredRow({ person }: { person: ReferredUser }) {
  const joined = new Date(person.joined_at).toLocaleDateString('en-MY', { day: 'numeric', month: 'short' });
  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => person.username && router.push(`/user/${person.username}`)}
    >
      <Avatar uri={person.avatar_url} name={person.display_name} size="md" />
      <View style={{ flex: 1, marginLeft: spacing[3] }}>
        <RText variant="titleSmall" numberOfLines={1}>{person.display_name}</RText>
        <Caption numberOfLines={1}>
          {person.username ? `@${person.username} · ` : ''}Joined {joined}
        </Caption>
      </View>
      {person.activated ? (
        <View style={[styles.statusChip, styles.statusActive]}>
          <Ionicons name="checkmark-circle" size={13} color={colors.success} />
          <RText variant="labelSmall" color={colors.success} style={{ marginLeft: 4 }}>Activated</RText>
        </View>
      ) : (
        <View style={styles.statusChip}>
          <RText variant="labelSmall" color={colors.textSecondary}>Joined</RText>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  scroll: { paddingHorizontal: spacing[4], paddingBottom: spacing[16] },

  hero: {
    borderRadius: radius['2xl'],
    padding: spacing[5],
    marginBottom: spacing[4],
  },
  codeRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[1], marginBottom: spacing[1] },
  code: { fontSize: 34, lineHeight: 40, fontWeight: '900', color: colors.white, letterSpacing: 4 },
  shareBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.white, borderRadius: radius.full, paddingVertical: spacing[3],
  },

  statGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing[3] },
  statCard: {
    flexBasis: '47%', flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing[4],
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.borderLight,
    ...(shadows.xs as object),
  },
  statIcon: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
  },

  trendPill: {
    flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[2],
    marginTop: spacing[4],
  },

  listTitle: { marginTop: spacing[6], marginBottom: spacing[3] },
  list: { gap: spacing[1] },
  row: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  statusChip: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.full, paddingHorizontal: spacing[3], paddingVertical: spacing[1] + 2,
  },
  statusActive: { backgroundColor: colors.successLight },

  empty: { alignItems: 'center', paddingTop: spacing[10], paddingHorizontal: spacing[6] },
});
