import React, { useState } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { createList } from '@/services/lists';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/toastStore';

export default function NewListScreen() {
  const { profile } = useAuthStore();
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);

  const createMutation = useMutation({
    mutationFn: () => createList(profile!.id, { title: title.trim(), description: description.trim() || undefined, is_public: isPublic }),
    onSuccess: (list) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      qc.invalidateQueries({ queryKey: queryKeys.userLists(profile!.id) });
      router.replace(`/list/${list.id}`);
    },
    onError: () => toast.error('Could not create the list. Try again.'),
  });

  const canCreate = title.trim().length >= 2 && !createMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="titleMedium">New list</RText>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ padding: spacing[4] }} keyboardShouldPersistTaps="handled">
          <Caption color={colors.textSecondary} style={{ marginBottom: spacing[2] }}>List name</Caption>
          <TextInput
            style={styles.titleInput}
            placeholder="e.g. Top Cafés in PJ"
            placeholderTextColor={colors.textTertiary}
            value={title}
            onChangeText={setTitle}
            maxLength={60}
            autoFocus
            returnKeyType="next"
          />

          <Caption color={colors.textSecondary} style={{ marginTop: spacing[5], marginBottom: spacing[2] }}>
            Description <RText variant="caption" color={colors.textTertiary}>(optional)</RText>
          </Caption>
          <TextInput
            style={styles.descInput}
            placeholder="What's this list about?"
            placeholderTextColor={colors.textTertiary}
            value={description}
            onChangeText={setDescription}
            maxLength={200}
            multiline
            textAlignVertical="top"
          />

          <TouchableOpacity style={styles.privacyRow} onPress={() => setIsPublic(!isPublic)} activeOpacity={0.8}>
            <Ionicons name={isPublic ? 'globe-outline' : 'lock-closed-outline'} size={20} color={colors.textSecondary} />
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <RText variant="titleSmall">{isPublic ? 'Public' : 'Private'}</RText>
              <Caption>{isPublic ? 'Anyone can view and save this list' : 'Only you can see this list'}</Caption>
            </View>
            <View style={[styles.toggle, isPublic && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>

          <Button
            label="Create list"
            onPress={() => createMutation.mutate()}
            isDisabled={!canCreate}
            isLoading={createMutation.isPending}
            fullWidth
            size="lg"
            style={{ marginTop: spacing[8] }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  titleInput: {
    fontSize: 22, fontWeight: '700', color: colors.textPrimary,
    borderBottomWidth: 1.5, borderBottomColor: colors.border, paddingVertical: spacing[2],
  },
  descInput: {
    fontSize: 15, color: colors.textPrimary, minHeight: 80,
    backgroundColor: colors.gray100, borderRadius: radius.lg, padding: spacing[3],
  },
  privacyRow: {
    flexDirection: 'row', alignItems: 'center',
    marginTop: spacing[6], padding: spacing[4],
    backgroundColor: colors.gray50, borderRadius: radius.xl,
  },
  toggle: { width: 44, height: 26, borderRadius: 13, backgroundColor: colors.gray300, padding: 2, justifyContent: 'center' },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.white },
  toggleThumbActive: { transform: [{ translateX: 18 }] },
});
