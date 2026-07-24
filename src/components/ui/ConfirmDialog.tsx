import React from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';

/**
 * Generic confirm/cancel dialog for destructive actions (delete account, block).
 * Replaces Alert.alert (the app is Alert-free — see toastStore migration).
 */
export function ConfirmDialog({
  visible,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive,
  loading,
  onConfirm,
  onCancel,
}: {
  visible: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Modal transparent visible={visible} animationType="fade" onRequestClose={onCancel}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={loading ? undefined : onCancel}>
        <TouchableOpacity activeOpacity={1} style={styles.card}>
          <RText variant="h4" align="center">{title}</RText>
          {message ? (
            <Caption align="center" color={colors.textSecondary} style={{ marginTop: spacing[2] }}>
              {message}
            </Caption>
          ) : null}

          <TouchableOpacity
            style={[styles.confirmBtn, destructive ? styles.destructive : styles.primary, loading && { opacity: 0.7 }]}
            onPress={onConfirm}
            disabled={loading}
            activeOpacity={0.9}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <RText variant="titleSmall" color={colors.white}>{confirmLabel}</RText>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onCancel} disabled={loading} style={{ marginTop: spacing[3] }}>
            <RText variant="labelMedium" color={colors.textSecondary}>{cancelLabel}</RText>
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
    maxWidth: 340,
    backgroundColor: colors.surface,
    borderRadius: radius['3xl'],
    padding: spacing[6],
    alignItems: 'center',
  },
  confirmBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    width: '100%',
    marginTop: spacing[5],
  },
  primary: { backgroundColor: colors.primary },
  destructive: { backgroundColor: colors.error },
});
