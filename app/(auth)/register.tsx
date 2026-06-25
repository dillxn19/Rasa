import React, { useState } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, Alert, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { colors, spacing, radius } from '@/theme';
import { Button } from '@/components/ui/Button';
import { RText, H2, Body, Caption } from '@/components/ui/Text';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleRegister = async () => {
    if (!email.trim()) {
      Alert.alert('Error', 'Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      Alert.alert('Error', 'Password must be at least 8 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: 'rasa://auth/callback',
        },
      });
      if (error) throw error;
      // Auth state listener redirects to onboarding
    } catch (error: unknown) {
      Alert.alert('Sign up failed', error instanceof Error ? error.message : 'Please try again.');
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
