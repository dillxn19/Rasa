import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/theme';
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { RText, H2, Body, Caption } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';

/**
 * Shown after email/password signup when Supabase email confirmation is on
 * (signUp returns no session until the link is clicked). The link confirms the
 * address server-side; the user then signs in. Also reachable from the root gate
 * and from a "Email not confirmed" login error.
 */
export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const supabaseUser = useAuthStore(s => s.supabaseUser);
  const email = params.email || supabaseUser?.email || '';
  const [sending, setSending] = useState(false);
  const [checking, setChecking] = useState(false);

  const resend = async () => {
    if (!email) return;
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

  // If a session exists, re-fetch the user to pick up a fresh confirmation.
  const checkVerified = async () => {
    setChecking(true);
    try {
      await supabase.auth.refreshSession().catch(() => {});
      const { data } = await supabase.auth.getUser();
      if (data.user?.email_confirmed_at) {
        useAuthStore.setState({ supabaseUser: data.user });
        toast.success('Email verified 🎉');
        router.replace('/');
        return;
      }
      toast.info("Not verified yet — tap the link in your email, then sign in.");
    } finally {
      setChecking(false);
    }
  };

  const goToLogin = async () => {
    await supabase.auth.signOut().catch(() => {});
    router.replace('/(auth)/login');
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.inner}>
        <View style={styles.icon}>
          <Ionicons name="mail-unread" size={40} color={colors.primary} />
        </View>
        <H2 style={{ textAlign: 'center', marginTop: spacing[5] }}>Verify your email</H2>
        <Body color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing[2], maxWidth: 320 }}>
          We sent a verification link to{'\n'}
          <RText variant="bodyMedium" color={colors.textPrimary} style={{ fontWeight: '700' }}>{email || 'your email'}</RText>.
          {'\n'}Tap it to confirm, then sign in.
        </Body>

        <View style={{ height: spacing[8] }} />

        <Button label="I've verified — sign in" onPress={goToLogin} fullWidth size="lg" />
        <TouchableOpacity onPress={checkVerified} disabled={checking} style={styles.secondary}>
          <RText variant="bodyMedium" color={colors.textSecondary}>{checking ? 'Checking…' : 'Refresh status'}</RText>
        </TouchableOpacity>

        <View style={styles.resendRow}>
          <Caption color={colors.textTertiary}>Didn't get it?</Caption>
          <TouchableOpacity onPress={resend} disabled={sending}>
            <Caption color={colors.primary} style={{ fontWeight: '700' }}>{sending ? '  Sending…' : '  Resend email'}</Caption>
          </TouchableOpacity>
        </View>

        <TouchableOpacity onPress={goToLogin} style={{ marginTop: spacing[6] }}>
          <Caption color={colors.textTertiary}>Use a different account</Caption>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[6] },
  icon: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center',
  },
  secondary: { paddingVertical: spacing[3], alignItems: 'center' },
  resendRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[4] },
});
