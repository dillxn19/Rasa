import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { colors, spacing, radius, shadows } from '@/theme';
import { RText } from '@/components/ui/Text';
import { useToastStore, type ToastType } from '@/stores/toastStore';

const CONFIG: Record<ToastType, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  success: { icon: 'checkmark-circle', color: colors.success, bg: '#EDF7EE' },
  error:   { icon: 'alert-circle',     color: colors.error,   bg: colors.errorLight },
  info:    { icon: 'information-circle', color: colors.info,  bg: colors.infoLight },
};

/**
 * App-wide toast host. Mount once at the root. Renders stacked, auto-dismissing,
 * swipe/tap-to-dismiss toasts — the replacement for Alert.alert notifications.
 */
export function ToastHost() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);
  const insets = useSafeAreaInsets();

  if (toasts.length === 0) return null;

  // Rendered inside a transparent RN Modal so toasts always sit ABOVE other
  // presented modals (e.g. the shop route-modal) — fixes toasts appearing behind.
  return (
    <Modal transparent visible statusBarTranslucent animationType="none" onRequestClose={() => {}}>
    <View style={[styles.host, { top: insets.top + spacing[2] }]} pointerEvents="box-none">
      {toasts.map((t) => {
        const cfg = CONFIG[t.type];
        return (
          <Animated.View key={t.id} entering={FadeInUp.springify().damping(18)} exiting={FadeOutUp.duration(180)}>
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => dismiss(t.id)}
              style={[styles.toast, { backgroundColor: cfg.bg }]}
            >
              <Ionicons name={cfg.icon} size={22} color={cfg.color} />
              <View style={{ flex: 1, marginLeft: spacing[3] }}>
                {t.title ? (
                  <RText variant="titleSmall" color={colors.textPrimary}>{t.title}</RText>
                ) : null}
                <RText variant="bodySmall" color={colors.textSecondary}>{t.message}</RText>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}
    </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  host: {
    position: 'absolute',
    left: spacing[4],
    right: spacing[4],
    zIndex: 1000,
    gap: spacing[2],
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radius.xl,
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[4],
    ...(shadows.lg as object),
  },
});
