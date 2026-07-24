import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing } from '@/theme';
import { RText, Body, Caption } from '@/components/ui/Text';

export interface LegalSection {
  heading: string;
  body: string;
}

export function LegalScreen({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="h4">{title}</RText>
        <View style={{ width: 26 }} />
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Caption color={colors.textTertiary} style={{ marginBottom: spacing[5] }}>
          Last updated {updated}
        </Caption>
        {sections.map((s, i) => (
          <View key={i} style={{ marginBottom: spacing[5] }}>
            <RText variant="titleMedium" style={{ marginBottom: spacing[2] }}>{s.heading}</RText>
            <Body color={colors.textSecondary} style={{ lineHeight: 22 }}>{s.body}</Body>
          </View>
        ))}
        <Caption color={colors.textTertiary} style={{ marginTop: spacing[2] }}>
          Questions? Email hello@rasa.my
        </Caption>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  content: { padding: spacing[5], paddingBottom: spacing[16] },
});
