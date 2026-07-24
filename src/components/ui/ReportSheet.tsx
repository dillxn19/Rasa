import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { REPORT_REASONS, reportContent, type ReportReason, type ReportInput } from '@/services/moderation';
import { track } from '@/lib/analytics';
import { toast } from '@/stores/toastStore';

type Target = Omit<ReportInput, 'reason' | 'description'>;

/**
 * Bottom sheet to report a review / user / comment. Files into the `reports`
 * table (moderation queue). Apple guideline 1.2 requires this for UGC.
 */
export function ReportSheet({
  visible,
  target,
  targetLabel,
  onClose,
}: {
  visible: boolean;
  target: Target;
  targetLabel: string; // e.g. "review", "@alice", "comment"
  onClose: () => void;
}) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setReason(null); setDescription(''); setSubmitting(false); };
  const close = () => { reset(); onClose(); };

  const submit = async () => {
    if (!reason) return;
    setSubmitting(true);
    try {
      await reportContent({ ...target, reason, description });
      track('content_reported', { reason });
      close();
      toast.success('Thanks — our team will review this.');
    } catch {
      setSubmitting(false);
      toast.error('Could not send report. Try again.');
    }
  };

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={close}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={close}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <RText variant="h4">Report {targetLabel}</RText>
          <Caption color={colors.textSecondary} style={{ marginTop: spacing[1], marginBottom: spacing[4] }}>
            Tell us what's wrong. Reports are anonymous.
          </Caption>

          {REPORT_REASONS.map(r => (
            <TouchableOpacity
              key={r.value}
              style={styles.reasonRow}
              onPress={() => setReason(r.value)}
              activeOpacity={0.7}
            >
              <RText variant="titleSmall" color={reason === r.value ? colors.primary : colors.textPrimary}>
                {r.label}
              </RText>
              <Ionicons
                name={reason === r.value ? 'radio-button-on' : 'radio-button-off'}
                size={20}
                color={reason === r.value ? colors.primary : colors.textTertiary}
              />
            </TouchableOpacity>
          ))}

          {reason ? (
            <TextInput
              style={styles.input}
              placeholder="Add details (optional)"
              placeholderTextColor={colors.textTertiary}
              value={description}
              onChangeText={setDescription}
              multiline
              maxLength={500}
            />
          ) : null}

          <TouchableOpacity
            style={[styles.submitBtn, (!reason || submitting) && { opacity: 0.5 }]}
            onPress={submit}
            disabled={!reason || submitting}
            activeOpacity={0.9}
          >
            {submitting ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <RText variant="titleSmall" color={colors.white}>Submit report</RText>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={close} style={{ marginTop: spacing[3], alignSelf: 'center' }}>
            <RText variant="labelMedium" color={colors.textSecondary}>Cancel</RText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(20,14,10,0.55)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius['3xl'],
    borderTopRightRadius: radius['3xl'],
    padding: spacing[6],
    paddingBottom: spacing[10],
  },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: spacing[4] },
  reasonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  input: {
    marginTop: spacing[4],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing[3],
    minHeight: 72,
    textAlignVertical: 'top',
    color: colors.textPrimary,
    fontSize: 15,
  },
  submitBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    alignItems: 'center',
    marginTop: spacing[5],
  },
});
