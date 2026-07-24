import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { toast } from '@/stores/toastStore';

/**
 * Shows on the home screen until the user confirms their email. No-ops when the
 * account is already confirmed (or when Supabase email confirmation is off, in
 * which case email_confirmed_at is set at signup). Dismissible for the session.
 */
export function EmailVerifyBanner() {
  const supabaseUser = useAuthStore(s => s.supabaseUser);
  const [dismissed, setDismissed] = useState(false);
  const [sending, setSending] = useState(false);

  const email = supabaseUser?.email;
  const confirmed = !!supabaseUser?.email_confirmed_at;
  if (confirmed || dismissed || !email) return null;

  const resend = async () => {
    setSending(true);
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email });
      if (error) throw error;
      toast.success('Verification email sent — check your inbox.');
    } catch {
      toast.error('Could not resend. Try again shortly.');
    } finally {
      setSending(false);
    }
  };

  return (
    <View style={styles.banner}>
      <Ionicons name="mail-unread-outline" size={20} color={colors.accentDark} />
      <View style={{ flex: 1, marginLeft: spacing[3] }}>
        <RText variant="titleSmall" color={colors.accentDark}>Verify your email</RText>
        <Caption color={colors.accentDark} style={{ opacity: 0.8 }}>
          Confirm {email} to secure your account.
        </Caption>
      </View>
      <TouchableOpacity onPress={resend} disabled={sending} style={styles.resendBtn}>
        <RText variant="labelMedium" color={colors.white}>{sending ? '…' : 'Resend'}</RText>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => setDismissed(true)} hitSlop={8} style={{ marginLeft: spacing[2] }}>
        <Ionicons name="close" size={18} color={colors.accentDark} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.accentSurface,
    borderRadius: radius.xl,
    padding: spacing[3],
    marginHorizontal: spacing[4],
    marginTop: spacing[3],
    borderWidth: 1,
    borderColor: colors.accentLight,
  },
  resendBtn: {
    backgroundColor: colors.accentDark,
    borderRadius: radius.full,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[2],
  },
});
