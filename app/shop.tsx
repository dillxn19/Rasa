import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TouchableOpacity, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption, H3 } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import {
  getUserCoins, getCoinHistory, purchaseTheme, SHOP_THEMES, type ThemeDef,
} from '@/services/coins';
import { toast } from '@/stores/toastStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const THEME_CARD_W = (SCREEN_WIDTH - spacing[4] * 2 - spacing[3]) / 2;

export default function ShopScreen() {
  const { profile, refreshProfile } = useAuthStore();
  const qc = useQueryClient();
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [activeTheme, setActiveThemeLocal] = useState<string>(profile?.active_theme ?? 'default');

  const { data: coins = 0 } = useQuery({
    queryKey: ['userCoins', profile?.id],
    queryFn: () => getUserCoins(profile!.id),
    enabled: !!profile,
    staleTime: 1000 * 15,
  });

  const { data: history = [] } = useQuery({
    queryKey: ['coinHistory', profile?.id],
    queryFn: () => getCoinHistory(profile!.id, 10),
    enabled: !!profile,
  });

  if (!profile) return null;

  const handleThemePress = async (theme: ThemeDef) => {
    if (theme.id === activeTheme || purchasing) return;
    const owned = theme.cost === 0 || coins >= theme.cost;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPurchasing(theme.id);
    try {
      const result = await purchaseTheme(profile.id, theme);
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setActiveThemeLocal(theme.id);
        qc.invalidateQueries({ queryKey: ['userCoins', profile.id] });
        qc.invalidateQueries({ queryKey: ['coinHistory', profile.id] });
        await refreshProfile().catch(() => {});
        toast.success(result.message, theme.cost > 0 && owned ? '🎉 Unlocked!' : 'Equipped');
      } else {
        toast.error(result.message, 'Not enough coins');
      }
    } catch {
      toast.error('Something went wrong. Try again.');
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="titleMedium">Rasa Shop</RText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing[16] }}>
        {/* Coin balance banner */}
        <LinearGradient
          colors={[colors.accent, colors.accentDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.balanceCard}
        >
          <View>
            <RText variant="labelMedium" color={colors.whiteTransparent90}>YOUR BALANCE</RText>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing[1] }}>
              <RText style={{ fontSize: 34, lineHeight: 42 }}>🪙</RText>
              <RText style={styles.balanceValue}>{coins.toLocaleString()}</RText>
            </View>
          </View>
          <View style={styles.earnHint}>
            <RText variant="caption" color={colors.white} style={{ textAlign: 'right' }}>
              Earn coins by{'\n'}reviewing & streaks
            </RText>
          </View>
        </LinearGradient>

        {/* How to earn */}
        <View style={styles.earnRow}>
          <EarnChip emoji="✍️" label="Review" value="+25" />
          <EarnChip emoji="🥇" label="First review" value="+20" />
          <EarnChip emoji="🔥" label="Weekly streak" value="+20" />
          <EarnChip emoji="⭐" label="5-week bonus" value="+100" />
        </View>

        {/* Themes */}
        <View style={styles.sectionHeader}>
          <H3>App Themes</H3>
          <Caption color={colors.textSecondary}>Recolour the whole app — Signature themes also change the font</Caption>
        </View>

        <View style={styles.grid}>
          {SHOP_THEMES.map(theme => {
            const isActive = theme.id === activeTheme;
            const canAfford = coins >= theme.cost;
            const isBuying = purchasing === theme.id;
            return (
              <TouchableOpacity
                key={theme.id}
                style={[styles.themeCard, isActive && styles.themeCardActive]}
                onPress={() => handleThemePress(theme)}
                activeOpacity={0.85}
                disabled={isBuying}
              >
                <View style={[styles.swatch, { backgroundColor: theme.preview.bg }]}>
                  <View style={[styles.swatchCircle, { backgroundColor: theme.preview.primary }]} />
                  <View style={[styles.swatchLine, { backgroundColor: theme.preview.surface }]} />
                  <RText style={{ fontSize: 26, lineHeight: 34 }}>{theme.emoji}</RText>
                  {theme.tier === 'signature' && (
                    <View style={styles.signatureBadge}>
                      <Ionicons name="sparkles" size={9} color={colors.white} />
                      <RText style={styles.signatureBadgeText}>SIGNATURE</RText>
                    </View>
                  )}
                </View>
                <View style={styles.themeMeta}>
                  <RText variant="titleSmall" numberOfLines={1}>{theme.name}</RText>
                  {theme.tier === 'signature' && theme.fontNote && (
                    <Caption color={colors.textTertiary} style={{ marginTop: -2 }}>
                      Aa · {theme.fontNote}
                    </Caption>
                  )}
                  {isActive ? (
                    <View style={styles.equippedChip}>
                      <Ionicons name="checkmark" size={12} color={colors.white} />
                      <RText style={{ fontSize: 10, color: colors.white, fontWeight: '800', marginLeft: 2 }}>
                        EQUIPPED
                      </RText>
                    </View>
                  ) : (
                    <View style={styles.priceRow}>
                      <RText style={{ fontSize: 13, lineHeight: 18 }}>{theme.cost === 0 ? '' : '🪙'}</RText>
                      <RText
                        variant="labelMedium"
                        color={theme.cost === 0 ? colors.success : canAfford ? colors.accentDark : colors.textTertiary}
                        style={{ marginLeft: theme.cost === 0 ? 0 : 3 }}
                      >
                        {theme.cost === 0 ? 'Free' : theme.cost}
                      </RText>
                      {isBuying && <RText variant="caption" color={colors.textTertiary} style={{ marginLeft: 6 }}>…</RText>}
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Recent activity */}
        {history.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <H3>Coin Activity</H3>
            </View>
            <View style={styles.historyList}>
              {history.map(tx => (
                <View key={tx.id} style={styles.historyRow}>
                  <View style={{ flex: 1 }}>
                    <RText variant="titleSmall" numberOfLines={1}>{tx.description ?? tx.type}</RText>
                    <Caption color={colors.textTertiary}>
                      {new Date(tx.created_at).toLocaleDateString()}
                    </Caption>
                  </View>
                  <RText
                    variant="titleSmall"
                    color={tx.amount >= 0 ? colors.success : colors.error}
                  >
                    {tx.amount >= 0 ? '+' : ''}{tx.amount} 🪙
                  </RText>
                </View>
              ))}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function EarnChip({ emoji, label, value }: { emoji: string; label: string; value: string }) {
  return (
    <View style={styles.earnChip}>
      <RText style={{ fontSize: 20, lineHeight: 26 }}>{emoji}</RText>
      <RText align="center" color={colors.textSecondary} style={styles.earnChipLabel}>{label}</RText>
      <RText variant="labelMedium" color={colors.accentDark} style={{ marginTop: 1 }}>{value}</RText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },

  balanceCard: {
    margin: spacing[4],
    borderRadius: radius['2xl'],
    padding: spacing[5],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    ...(shadows.md as object),
  },
  balanceValue: {
    fontSize: 36,
    lineHeight: 44,
    fontWeight: '800',
    color: colors.white,
    marginLeft: spacing[2],
  },
  earnHint: { maxWidth: 130 },

  earnRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing[4],
    gap: spacing[2],
    marginBottom: spacing[4],
  },
  earnChip: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-start',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[1],
    minHeight: 92,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  earnChipLabel: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 4,
    minHeight: 28,
  },

  sectionHeader: {
    paddingHorizontal: spacing[4],
    paddingTop: spacing[3],
    paddingBottom: spacing[3],
    gap: 2,
  },

  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing[4],
    gap: spacing[3],
  },
  themeCard: {
    width: THEME_CARD_W,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'transparent',
    ...(shadows.sm as object),
  },
  themeCardActive: { borderColor: colors.primary },
  swatch: {
    height: 96,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  swatchCircle: {
    position: 'absolute',
    top: spacing[3],
    left: spacing[3],
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  swatchLine: {
    position: 'absolute',
    bottom: spacing[3],
    left: spacing[3],
    right: spacing[3],
    height: 8,
    borderRadius: 4,
  },
  signatureBadge: {
    position: 'absolute',
    top: spacing[2],
    right: spacing[2],
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.55)',
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
    borderRadius: radius.full,
    gap: 2,
  },
  signatureBadgeText: {
    color: colors.white,
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  themeMeta: {
    padding: spacing[3],
    gap: spacing[1],
  },
  priceRow: { flexDirection: 'row', alignItems: 'center' },
  equippedChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[2],
    paddingVertical: 2,
  },

  historyList: {
    paddingHorizontal: spacing[4],
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
});
