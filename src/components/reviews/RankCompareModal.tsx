import React, { useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { getRankBucket, reorderReviews, type RankBucketItem } from '@/services/ranking';

/**
 * Beli-style relative ranking. After rating a place N stars, we slot it among
 * the user's OTHER N-star places via a quick binary-search of "which was
 * better?" comparisons (~log2(n) taps). The result re-spaces rank_score so the
 * rankings list is finely ordered within the tier. Fully skippable.
 */
export function RankCompareModal({
  visible,
  userId,
  reviewId,
  restaurantName,
  rating,
  onDone,
}: {
  visible: boolean;
  userId: string;
  reviewId: string;
  restaurantName: string;
  rating: number;
  onDone: () => void;
}) {
  const [bucket, setBucket] = useState<RankBucketItem[] | null>(null);
  // Binary search window [lo, hi] — insertion index lands when lo === hi.
  const [lo, setLo] = useState(0);
  const [hi, setHi] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;
    setBucket(null);
    getRankBucket(userId, rating, reviewId).then((b) => {
      if (cancelled) return;
      setBucket(b);
      setLo(0);
      setHi(b.length);
      // Nothing to compare against → just seed a score and close.
      if (b.length === 0) {
        reorderReviews(userId, rating, [reviewId]).finally(onDone);
      }
    });
    return () => { cancelled = true; };
  }, [visible, userId, rating, reviewId]);

  const mid = useMemo(() => Math.floor((lo + hi) / 2), [lo, hi]);

  const commit = async (insertIndex: number) => {
    if (!bucket) return;
    setSaving(true);
    const ordered = [
      ...bucket.slice(0, insertIndex).map(b => b.reviewId),
      reviewId,
      ...bucket.slice(insertIndex).map(b => b.reviewId),
    ];
    try {
      await reorderReviews(userId, rating, ordered);
    } finally {
      setSaving(false);
      onDone();
    }
  };

  // User picked which place they preferred → narrow the window.
  const choose = (newIsBetter: boolean) => {
    Haptics.selectionAsync().catch(() => {});
    const nextLo = newIsBetter ? lo : mid + 1;
    const nextHi = newIsBetter ? mid : hi;
    if (nextLo >= nextHi) {
      commit(nextLo);
      return;
    }
    setLo(nextLo);
    setHi(nextHi);
  };

  // "Too tough to call" → tie with THIS comparison: place the new spot right
  // next to it and finish (Beli-style per-comparison skip — not abandoning the
  // whole ranking, unlike `skip` below).
  const tooTough = () => commit(mid);

  // Skip → drop it at the bottom of the tier (still gets a score).
  const skip = () => bucket && commit(bucket.length);

  const comparison = bucket && bucket.length > 0 ? bucket[mid] : null;
  const total = bucket?.length ?? 0;
  // Rough progress: how many comparisons remain in the worst case.
  const stepsLeft = total > 0 ? Math.ceil(Math.log2(Math.max(2, hi - lo + 1))) : 0;

  return (
    <Modal transparent visible={visible} animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          {bucket === null ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[8] }} />
          ) : comparison ? (
            <>
              <Caption color={colors.textTertiary} align="center">
                {'★'.repeat(rating)} · WHICH DID YOU LIKE MORE?
              </Caption>

              <TouchableOpacity
                style={styles.choice}
                onPress={() => choose(true)}
                disabled={saving}
                activeOpacity={0.85}
              >
                <RText variant="titleMedium" align="center" numberOfLines={2}>{restaurantName}</RText>
                <Caption color={colors.primary} style={{ marginTop: 2 }}>the one you just rated</Caption>
              </TouchableOpacity>

              <View style={styles.vsRow}>
                <View style={styles.vsLine} />
                <RText variant="labelMedium" color={colors.textTertiary} style={{ marginHorizontal: spacing[3] }}>VS</RText>
                <View style={styles.vsLine} />
              </View>

              <TouchableOpacity
                style={styles.choice}
                onPress={() => choose(false)}
                disabled={saving}
                activeOpacity={0.85}
              >
                <RText variant="titleMedium" align="center" numberOfLines={2}>{comparison.restaurantName}</RText>
                <Caption color={colors.textTertiary} style={{ marginTop: 2 }}>already on your list</Caption>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={tooTough}
                disabled={saving}
                style={styles.tooToughBtn}
                activeOpacity={0.85}
              >
                <RText variant="labelMedium" color={colors.textPrimary} align="center">Too tough to call</RText>
              </TouchableOpacity>

              <TouchableOpacity onPress={skip} disabled={saving} style={{ marginTop: spacing[3] }}>
                {saving
                  ? <ActivityIndicator color={colors.textSecondary} />
                  : <RText variant="labelMedium" color={colors.textTertiary} align="center">Skip ranking for now</RText>}
              </TouchableOpacity>
              {stepsLeft > 1 && (
                <Caption color={colors.textTertiary} align="center" style={{ marginTop: spacing[2] }}>
                  ~{stepsLeft} quick taps to place it
                </Caption>
              )}
            </>
          ) : (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[8] }} />
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(20,14,10,0.6)',
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
  },
  choice: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    paddingVertical: spacing[5],
    paddingHorizontal: spacing[4],
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
  },
  tooToughBtn: {
    marginTop: spacing[5],
    paddingVertical: spacing[3],
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.gray50,
  },
  vsRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[4] },
  vsLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
});
