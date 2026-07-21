import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import type { FeatureDef } from '@/services/features';

/**
 * Shown when a user taps a locked premium feature. Explains the two unlock
 * paths: invite friends (always) and/or buy with coins (dual-track features).
 */
export function FeatureGateModal({
  feature,
  referralCount,
  coins,
  onClose,
  onUnlockWithCoins,
  onInvite,
}: {
  feature: FeatureDef | null;
  referralCount: number;
  coins: number;
  onClose: () => void;
  onUnlockWithCoins: (feature: FeatureDef) => void;
  onInvite: () => void;
}) {
  if (!feature) return null;

  const remaining = Math.max(0, feature.referralsRequired - referralCount);
  const canBuy = feature.coinCost != null && coins >= feature.coinCost;

  return (
    <Modal transparent visible animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <View style={styles.badge}>
            <RText style={{ fontSize: 40, lineHeight: 50 }}>{feature.emoji}</RText>
            <View style={styles.lock}>
              <Ionicons name="lock-closed" size={14} color={colors.white} />
            </View>
          </View>

          <RText variant="h3" align="center" style={{ marginTop: spacing[3] }}>{feature.name}</RText>
          <Caption align="center" color={colors.textSecondary} style={{ marginTop: spacing[2], maxWidth: 260 }}>
            {feature.description}
          </Caption>

          {/* Referral path */}
          <TouchableOpacity style={styles.pathBtn} onPress={onInvite} activeOpacity={0.9}>
            <Ionicons name="people" size={18} color={colors.white} />
            <RText variant="titleSmall" color={colors.white} style={{ marginLeft: spacing[2] }}>
              {remaining === 0
                ? 'Invite friends to unlock'
                : `Invite ${remaining} ${remaining === 1 ? 'friend' : 'friends'} — free`}
            </RText>
          </TouchableOpacity>

          {/* Coin path (dual-track only) */}
          {feature.coinCost != null ? (
            <>
              <View style={styles.orRow}>
                <View style={styles.orLine} />
                <Caption color={colors.textTertiary} style={{ marginHorizontal: spacing[3] }}>or</Caption>
                <View style={styles.orLine} />
              </View>
              <TouchableOpacity
                style={[styles.coinBtn, !canBuy && { opacity: 0.5 }]}
                onPress={() => canBuy && onUnlockWithCoins(feature)}
                disabled={!canBuy}
                activeOpacity={0.9}
              >
                <RText variant="titleSmall" color={colors.accentDark}>
                  🪙 Unlock for {feature.coinCost}
                </RText>
              </TouchableOpacity>
              {!canBuy && (
                <Caption align="center" color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
                  You have {coins.toLocaleString()} 🪙
                </Caption>
              )}
            </>
          ) : (
            <Caption align="center" color={colors.textTertiary} style={{ marginTop: spacing[3] }}>
              Referral-only feature — invite friends to unlock it.
            </Caption>
          )}

          <TouchableOpacity onPress={onClose} style={{ marginTop: spacing[4] }}>
            <RText variant="labelMedium" color={colors.textSecondary}>Maybe later</RText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,14,10,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing[6],
  },
  card: {
    width: '100%',
    maxWidth: 360,
    backgroundColor: colors.surface,
    borderRadius: radius['3xl'],
    padding: spacing[6],
    alignItems: 'center',
  },
  badge: { position: 'relative' },
  lock: {
    position: 'absolute',
    bottom: -2,
    right: -6,
    backgroundColor: colors.textPrimary,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.surface,
  },
  pathBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    width: '100%',
    marginTop: spacing[5],
  },
  orRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginVertical: spacing[3] },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  coinBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accentSurface,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    width: '100%',
    borderWidth: 1,
    borderColor: colors.accentLight,
  },
});
