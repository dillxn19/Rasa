import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { RText, H2, Body, Caption } from '@/components/ui/Text';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Please enter your email and password.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });

      if (error) throw error;
      // Auth state change will redirect automatically
    } catch (error: unknown) {
      Alert.alert('Login failed', error instanceof Error ? error.message : 'Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = () => {
    Alert.prompt(
      'Reset Password',
      'Enter your email address and we\'ll send you a reset link.',
      async (inputEmail) => {
        if (!inputEmail?.trim()) return;
        const { error } = await supabase.auth.resetPasswordForEmail(inputEmail.trim());
        if (error) {
          Alert.alert('Error', error.message);
        } else {
          Alert.alert('Check your email', 'A password reset link has been sent.');
        }
      },
      'plain-text',
      email,
    );
  };

  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
    if (error) Alert.alert('Error', error.message);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.inner}>
        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Back button */}
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.logo}>
              <RText style={styles.logoText}>Rasa</RText>
            </View>
            <H2 style={{ marginTop: spacing[6] }}>Welcome back</H2>
            <Body color={colors.textSecondary}>Sign in to continue your food journey</Body>
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
              <View style={styles.passwordHeader}>
                <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
                  Password
                </RText>
                <TouchableOpacity onPress={handleForgotPassword}>
                  <Caption color={colors.primary}>Forgot?</Caption>
                </TouchableOpacity>
              </View>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={[styles.input, styles.passwordInput]}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={colors.textTertiary}
                  secureTextEntry={!showPassword}
                  returnKeyType="done"
                  onSubmitEditing={handleLogin}
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
            </View>

            <Button
              label="Sign in"
              onPress={handleLogin}
              fullWidth
              size="lg"
              isLoading={isLoading}
            />

            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Caption style={{ marginHorizontal: spacing[4] }}>or</Caption>
              <View style={styles.dividerLine} />
            </View>

            <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleLogin}>
              <RText style={styles.googleIcon}>G</RText>
              <RText variant="titleMedium">Continue with Google</RText>
            </TouchableOpacity>
          </View>

          <View style={styles.footer}>
            <Body color={colors.textSecondary}>
              Don't have an account?{' '}
              <RText
                variant="bodyMedium"
                color={colors.primary}
                style={{ fontWeight: '600' }}
                onPress={() => router.push('/(auth)/register')}
              >
                Sign up
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
    paddingVertical: spacing[2],
    borderRadius: radius.lg,
    alignSelf: 'flex-start',
  },
  logoText: { fontSize: 22, fontWeight: '800', color: colors.white, letterSpacing: -1 },
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
  passwordHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  passwordContainer: { position: 'relative' },
  passwordInput: { paddingRight: 52 },
  eyeBtn: { position: 'absolute', right: spacing[4], top: '50%', transform: [{ translateY: -10 }] },
  dividerRow: { flexDirection: 'row', alignItems: 'center' },
  dividerLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.border },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 52,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    gap: spacing[3],
  },
  googleIcon: { fontSize: 18, fontWeight: '700', color: '#4285F4' },
  footer: { alignItems: 'center', paddingVertical: spacing[8] },
});
