import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, TextInput, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/theme';
import { RText, H2, Body, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';

const SUPPORT_EMAIL = 'hello@rasamalaysia.org';

/**
 * Contact Us / Support — a simple, dependency-free help screen (also satisfies
 * App Store "support URL/contact" expectations). Composes an email to the team.
 */
export default function SupportScreen() {
  const { profile } = useAuthStore();
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const sendEmail = () => {
    const body = `${message}\n\n— ${profile?.display_name ?? ''} (@${profile?.username ?? ''})`;
    const url = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject || 'Rasa support')}&body=${encodeURIComponent(body)}`;
    Linking.openURL(url).catch(() => {});
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="h4">Contact Us</RText>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <RText style={{ fontSize: 40, lineHeight: 50 }}>💬</RText>
          <H2 style={{ marginTop: spacing[2] }}>We're here to help</H2>
          <Body color={colors.textSecondary} style={{ marginTop: spacing[1] }}>
            Questions, bugs, or feedback? Send us a note and we'll get back to you.
          </Body>
        </View>

        {/* Quick contact rows */}
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}`)} activeOpacity={0.7}>
          <View style={styles.rowIcon}><Ionicons name="mail-outline" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <RText variant="titleSmall">Email us</RText>
            <Caption color={colors.textSecondary}>{SUPPORT_EMAIL}</Caption>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.row} onPress={() => Linking.openURL('https://instagram.com/_rasa.malaysia_')} activeOpacity={0.7}>
          <View style={styles.rowIcon}><Ionicons name="logo-instagram" size={20} color={colors.primary} /></View>
          <View style={{ flex: 1 }}>
            <RText variant="titleSmall">DM us on Instagram</RText>
            <Caption color={colors.textSecondary}>@_rasa.malaysia_</Caption>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
        </TouchableOpacity>

        {/* Message form */}
        <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>SEND A MESSAGE</RText>
        <TextInput
          style={styles.input}
          value={subject}
          onChangeText={setSubject}
          placeholder="Subject"
          placeholderTextColor={colors.textTertiary}
        />
        <TextInput
          style={[styles.input, styles.textarea]}
          value={message}
          onChangeText={setMessage}
          placeholder="How can we help?"
          placeholderTextColor={colors.textTertiary}
          multiline
        />
        <Button label="Send" onPress={sendEmail} fullWidth size="lg" disabled={!message.trim()} />

        <View style={styles.links}>
          <TouchableOpacity onPress={() => router.push('/legal/privacy')}><Caption color={colors.primary}>Privacy Policy</Caption></TouchableOpacity>
          <Caption color={colors.textTertiary}>  ·  </Caption>
          <TouchableOpacity onPress={() => router.push('/legal/terms')}><Caption color={colors.primary}>Terms of Service</Caption></TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
  },
  scroll: { paddingHorizontal: spacing[4], paddingBottom: spacing[16] },
  hero: { alignItems: 'center', paddingVertical: spacing[5] },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing[3],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  rowIcon: {
    width: 40, height: 40, borderRadius: radius.xl,
    backgroundColor: colors.primarySurface, alignItems: 'center', justifyContent: 'center',
  },
  label: { textTransform: 'uppercase', letterSpacing: 0.5, marginTop: spacing[6], marginBottom: spacing[2] },
  input: {
    borderWidth: 1, borderColor: colors.border, borderRadius: radius.xl,
    paddingHorizontal: spacing[4], paddingVertical: spacing[4], fontSize: 16,
    color: colors.textPrimary, backgroundColor: colors.gray50, marginBottom: spacing[3],
  },
  textarea: { height: 130, textAlignVertical: 'top' },
  links: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: spacing[6] },
});
