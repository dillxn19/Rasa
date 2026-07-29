import React, { useState, useEffect } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/theme';
import { toast } from '@/stores/toastStore';
import { getPendingReferrer, setPendingReferrer } from '@/lib/referral';
import { getSignupGate, validateReferralCode } from '@/services/signup';
import { Button } from '@/components/ui/Button';
import { RText, H2, Body, Caption } from '@/components/ui/Text';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [referrer, setReferrer] = useState<string | null>(null);
  const [refCode, setRefCode] = useState('');
  // Invite-only gate (defaults on until we hear otherwise, so it fails closed).
  const [gateOn, setGateOn] = useState(true);

  useEffect(() => {
    getPendingReferrer().then((r) => {
      setReferrer(r);
      if (r) setRefCode(r.toUpperCase());
    }).catch(() => {});
    getSignupGate().then(setGateOn).catch(() => setGateOn(true));
  }, []);

  const handleRegister = async () => {
    if (!email.trim()) {
      toast.error('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters.');
      return;
    }

    const ref = refCode.trim();
    // Invite-only: block before creating the account if the code is missing/invalid.
    if (gateOn) {
      if (!ref) {
        toast.error('Rasa is invite-only right now — enter a friend\'s referral code.');
        return;
      }
      setIsLoading(true);
      const valid = await validateReferralCode(ref).catch(() => false);
      if (!valid) {
        setIsLoading(false);
        toast.error('That referral code isn\'t valid. Check it and try again.', 'Invalid code');
        return;
      }
    }

    setIsLoading(true);
    try {
      const emailNorm = email.trim().toLowerCase();
      const { data, error } = await supabase.auth.signUp({
        email: emailNorm,
        password,
        options: {
          emailRedirectTo: 'rasa://auth/callback',
        },
      });
      if (error) throw error;
      // Persist the typed/link referral code so onboarding records it after signup.
      if (ref) await setPendingReferrer(ref);
      // When email confirmation is ON, signUp returns no session — the user must
      // verify first. Otherwise (confirmations off) they're signed in → onboard.
      if (!data.session) {
        router.replace({ pathname: '/(auth)/verify-email', params: { email: emailNorm } });
      } else {
        router.replace('/(auth)/onboarding');
      }
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Please try again.', 'Sign up failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logo}>
              <RText style={styles.logoText}>Rasa</RText>
            </View>
            <H2 style={{ marginTop: spacing[6] }}>Create account</H2>
            <Body color={colors.textSecondary}>
              Join Malaysia's food community
            </Body>

            {referrer && (
              <View style={styles.referBanner}>
                <RText style={{ fontSize: 18, lineHeight: 22 }}>🎁</RText>
                <Caption color={colors.textSecondary} style={{ flex: 1, marginLeft: spacing[2] }}>
                  Invited by <Caption color={colors.primary} style={{ fontWeight: '700' }}>@{referrer}</Caption> — you'll be connected once you post your first review.
                </Caption>
              </View>
            )}
          </View>

          <View style={styles.form}>
            <View style={styles.field}>
              <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
                Email
              </RText>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="your@email.com"
                placeholderTextColor={colors.textTertiary}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                returnKeyType="next"
              />
            </View>

            <View style={styles.field}>
              <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
                Password
              </RText>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="Min. 8 characters"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleRegister}
                />
                <TouchableOpacity
                  style={styles.eyeBtn}
                  onPress={() => setShowPassword(!showPassword)}
                >
                  <Ionicons
                    name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textTertiary}
                  />
                </TouchableOpacity>
              </View>
              {password.length > 0 && (
                <View style={styles.strengthBar}>
                  {[1,2,3,4].map(i => (
                    <View
                      key={i}
                      style={[
                        styles.strengthSegment,
                        password.length >= i * 3 && { backgroundColor: password.length >= 12 ? colors.success : colors.warning },
                      ]}
                    />
                  ))}
                </View>
              )}
            </View>

            {!referrer && (
              <View style={styles.field}>
                <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
                  {gateOn ? 'Referral code' : 'Referral code (optional)'}
                </RText>
                <TextInput
                  style={styles.input}
                  value={refCode}
                  onChangeText={(t) => setRefCode(t.toUpperCase())}
                  placeholder="e.g. MK7Q27"
                  placeholderTextColor={colors.textTertiary}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  maxLength={10}
                  returnKeyType="done"
                />
                {gateOn && (
                  <Caption color={colors.textTertiary}>
                    Rasa is invite-only right now — enter a friend's code to join.
                  </Caption>
                )}
              </View>
            )}

            <Caption color={colors.textTertiary} align="center">
              By signing up, you agree to our Terms of Service and Privacy Policy.
            </Caption>

            <Button
              label="Create account"
              onPress={handleRegister}
              fullWidth
              size="lg"
              isLoading={isLoading}
            />
          </View>

          <View style={styles.footer}>
            <Body color={colors.textSecondary}>
              Already have an account?{' '}
              <RText
                variant="bodyMedium"
                color={colors.primary}
                style={{ fontWeight: '600' }}
                onPress={() => router.push('/(auth)/login')}
              >
                Sign in
              </RText>
            </Body>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  inner: { flex: 1, paddingHorizontal: spacing[6] },
  backBtn: { marginTop: spacing[4], marginBottom: spacing[2], alignSelf: 'flex-start', padding: spacing[1] },
  header: { marginBottom: spacing[8] },
  logo: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.lg,
    alignSelf: 'flex-start',
  },
  logoText: { fontSize: 22, lineHeight: 30, fontWeight: '800', color: colors.white, letterSpacing: -1 },
  referBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySurface,
    borderRadius: radius.lg,
    padding: spacing[3],
    marginTop: spacing[4],
  },
  form: { gap: spacing[5] },
  field: { gap: spacing[2] },
  label: { textTransform: 'uppercase', letterSpacing: 0.5 },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.gray50,
  },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: spacing[4], top: '50%', transform: [{ translateY: -10 }] },
  strengthBar: { flexDirection: 'row', gap: spacing[1], marginTop: spacing[2] },
  strengthSegment: {
    flex: 1,
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.gray200,
  },
  footer: { alignItems: 'center', paddingVertical: spacing[8] },
});
