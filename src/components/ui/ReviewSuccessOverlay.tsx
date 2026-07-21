import React, { useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withSequence,
  withRepeat,
  Easing,
  FadeIn,
} from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface ReviewSuccessData {
  coinsEarned: number;
  streakWeeks: number | null;
  isNewWeek: boolean;
  isMilestone: boolean;
  isFirstReview: boolean;
  isEdit?: boolean;
  cappedDaily?: boolean;
  restaurantName?: string;
}

// A few coins that float up behind the card for a little delight.
const FLOATERS = [
  { left: '12%', delay: 120, size: 26 },
  { left: '28%', delay: 320, size: 18 },
  { left: '68%', delay: 220, size: 22 },
  { left: '84%', delay: 420, size: 16 },
  { left: '48%', delay: 520, size: 20 },
];

function FloatingCoin({ left, delay, size }: { left: string; delay: number; size: number }) {
  const y = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(delay, withSequence(withTiming(1, { duration: 200 }), withDelay(500, withTiming(0, { duration: 500 }))));
    y.value = withDelay(delay, withTiming(-160, { duration: 1200, easing: Easing.out(Easing.quad) }));
  }, []);

  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: y.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View style={[styles.floater, { left } as any, style]} pointerEvents="none">
      <RText style={{ fontSize: size, lineHeight: size + 4 }}>🪙</RText>
    </Animated.View>
  );
}

export function ReviewSuccessOverlay({
  data,
  onDismiss,
}: {
  data: ReviewSuccessData;
  onDismiss: () => void;
}) {
  const cardScale = useSharedValue(0.8);
  const cardOpacity = useSharedValue(0);
  const coinScale = useSharedValue(0);
  const badgeSpin = useSharedValue(0);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 220 });
    cardScale.value = withSpring(1, { damping: 13, stiffness: 220 });
    coinScale.value = withDelay(180, withSpring(1, { damping: 9, stiffness: 260 }));
    badgeSpin.value = withDelay(180, withSequence(
      withTiming(-0.06, { duration: 120 }),
      withRepeat(withSequence(
        withTiming(0.06, { duration: 900 }),
        withTiming(-0.06, { duration: 900 }),
      ), -1, true),
    ));
  }, []);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));

  const coinStyle = useAnimatedStyle(() => ({
    transform: [{ scale: coinScale.value }, { rotate: `${badgeSpin.value}rad` }],
  }));

  const title = data.isEdit
    ? 'Review updated!'
    : data.isMilestone
      ? 'Milestone unlocked!'
      : data.isFirstReview
        ? "You're the first! 🎉"
        : 'Review posted!';

  return (
    <View style={styles.overlay}>
      <Animated.View entering={FadeIn.duration(200)} style={StyleSheet.absoluteFill}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onDismiss} />
      </Animated.View>

      {!data.isEdit && FLOATERS.map((f, i) => (
        <FloatingCoin key={i} left={f.left} delay={f.delay} size={f.size} />
      ))}

      <Animated.View style={[styles.card, cardStyle]}>
        <Animated.View style={[styles.coinBadge, coinStyle]}>
          <LinearGradient
            colors={data.isEdit ? [colors.success, colors.successDark] : [colors.accent, colors.accentDark]}
            style={styles.coinBadgeInner}
          >
            <RText style={{ fontSize: 44, lineHeight: 54 }}>{data.isEdit ? '✅' : '🪙'}</RText>
          </LinearGradient>
        </Animated.View>

        <RText variant="h3" align="center" style={{ marginTop: spacing[4] }}>{title}</RText>
        {data.restaurantName ? (
          <Caption align="center" color={colors.textSecondary} style={{ marginTop: 2 }}>
            {data.restaurantName}
          </Caption>
        ) : null}

        {data.isEdit ? (
          <Caption align="center" color={colors.textSecondary} style={{ marginTop: spacing[4], maxWidth: 240 }}>
            Your changes are live. Coins are only earned on your first review of a place.
          </Caption>
        ) : (
        <>
        {/* Coins earned */}
        <View style={styles.coinRow}>
          <RText style={{ fontSize: 22, lineHeight: 28 }}>🪙</RText>
          <RText variant="h2" color={colors.accentDark} style={{ marginLeft: spacing[2] }}>
            +{data.coinsEarned}
          </RText>
          <RText variant="titleMedium" color={colors.textSecondary} style={{ marginLeft: spacing[2] }}>
            Rasa Coins
          </RText>
        </View>

        {/* Breakdown chips */}
        <View style={styles.chipRow}>
          <View style={styles.chip}>
            <RText variant="labelSmall" color={colors.textSecondary}>Review +25</RText>
          </View>
          {data.isFirstReview && (
            <View style={[styles.chip, styles.chipHighlight]}>
              <RText variant="labelSmall" color={colors.primary}>First review +20</RText>
            </View>
          )}
          {data.isNewWeek && (
            <View style={[styles.chip, styles.chipStreak]}>
              <RText variant="labelSmall" color={colors.accentDark}>Weekly +20</RText>
            </View>
          )}
          {data.isMilestone && (
            <View style={[styles.chip, styles.chipStreak]}>
              <RText variant="labelSmall" color={colors.accentDark}>Milestone +100</RText>
            </View>
          )}
        </View>
        </>
        )}

        {/* Daily cap note */}
        {!data.isEdit && data.cappedDaily ? (
          <Caption align="center" color={colors.textTertiary} style={{ marginTop: spacing[3], maxWidth: 240 }}>
            You've hit today's coin cap — your review still counts, come back tomorrow for more 🪙
          </Caption>
        ) : null}

        {/* Streak line */}
        {!data.isEdit && data.streakWeeks && data.streakWeeks > 0 ? (
          <View style={styles.streakLine}>
            <RText style={{ fontSize: 18, lineHeight: 24 }}>🔥</RText>
            <RText variant="titleSmall" color={colors.primary} style={{ marginLeft: 6 }}>
              {data.streakWeeks} week streak
            </RText>
            {data.isNewWeek && (
              <Caption color={colors.textSecondary} style={{ marginLeft: 6 }}>· keep it going!</Caption>
            )}
          </View>
        ) : null}

        <TouchableOpacity style={styles.doneBtn} onPress={onDismiss} activeOpacity={0.9}>
          <RText variant="titleSmall" color={colors.white}>Awesome</RText>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 500,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(20, 14, 10, 0.55)',
  },
  floater: {
    position: 'absolute',
    bottom: '42%',
  },
  card: {
    width: Math.min(SCREEN_WIDTH - spacing[8], 360),
    backgroundColor: colors.surface,
    borderRadius: radius['3xl'],
    paddingHorizontal: spacing[6],
    paddingTop: spacing[8],
    paddingBottom: spacing[6],
    alignItems: 'center',
    ...(shadows.xl as object),
  },
  coinBadge: {
    marginTop: -spacing[16],
  },
  coinBadgeInner: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: colors.surface,
    ...(shadows.md as object),
  },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[5],
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: spacing[2],
    marginTop: spacing[4],
  },
  chip: {
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    backgroundColor: colors.gray100,
  },
  chipHighlight: { backgroundColor: colors.primarySurface },
  chipStreak: { backgroundColor: colors.accentSurface },
  streakLine: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing[4],
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
  },
  doneBtn: {
    marginTop: spacing[6],
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    alignItems: 'center',
    width: '100%',
  },
});
