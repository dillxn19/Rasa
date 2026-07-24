import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, TextInput, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import {
  getUserListsForRestaurant, addRestaurantToList, removeRestaurantFromList, createList,
  type ListWithMembership,
} from '@/services/lists';
import { queryKeys } from '@/lib/queryClient';
import { toast } from '@/stores/toastStore';
import * as Haptics from 'expo-haptics';

// Rotating tile gradients so each list reads as its own thing.
const TILE_COLORS: [string, string][] = [
  ['#D94841', '#8B1E1E'],
  ['#F4B942', '#B4801F'],
  ['#4F8A5B', '#1F5C3A'],
  ['#3B82F6', '#1E40AF'],
  ['#BE185D', '#7A0E3E'],
  ['#7C3AED', '#4C1D95'],
];

/**
 * "Add to list" picker — like adding a song to playlists. Shows the user's
 * lists with a check when this restaurant is already in them; tapping toggles
 * membership. A new list can be created inline.
 */
export function SaveToListSheet({
  visible,
  userId,
  restaurantId,
  restaurantName,
  onClose,
}: {
  visible: boolean;
  userId: string;
  restaurantId: string;
  restaurantName: string;
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: lists, isLoading } = useQuery({
    queryKey: ['listsForRestaurant', userId, restaurantId],
    queryFn: () => getUserListsForRestaurant(userId, restaurantId),
    enabled: visible && !!userId && !!restaurantId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['listsForRestaurant', userId, restaurantId] });
    qc.invalidateQueries({ queryKey: queryKeys.userLists(userId) });
  };

  const toggle = async (list: ListWithMembership) => {
    setBusyId(list.id);
    Haptics.selectionAsync().catch(() => {});
    try {
      if (list.contains) {
        await removeRestaurantFromList(list.id, restaurantId);
      } else {
        await addRestaurantToList(list.id, restaurantId, userId);
      }
      invalidate();
    } catch {
      toast.error('Could not update the list.');
    } finally {
      setBusyId(null);
    }
  };

  const createMutation = useMutation({
    mutationFn: async () => {
      const list = await createList(userId, { title: newTitle.trim() });
      await addRestaurantToList(list.id, restaurantId);
      return list;
    },
    onSuccess: () => {
      setNewTitle('');
      setCreating(false);
      invalidate();
      toast.success(`Added to "${newTitle.trim()}"`);
    },
    onError: () => toast.error('Could not create the list.'),
  });

  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.sheet}>
          <View style={styles.handle} />
          <RText variant="h3">Save to list</RText>
          <View style={styles.subHeader}>
            <Ionicons name="location" size={13} color={colors.primary} />
            <Caption color={colors.textSecondary} numberOfLines={1} style={{ marginLeft: 4, flex: 1 }}>
              {restaurantName}
            </Caption>
          </View>

          {isLoading ? (
            <ActivityIndicator color={colors.primary} style={{ marginVertical: spacing[8] }} />
          ) : (
            <ScrollView style={{ maxHeight: 340 }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {(lists ?? []).map((list, i) => (
                <TouchableOpacity
                  key={list.id}
                  style={[styles.listRow, list.contains && styles.listRowActive]}
                  onPress={() => toggle(list)}
                  disabled={busyId === list.id}
                  activeOpacity={0.8}
                >
                  <LinearGradient colors={TILE_COLORS[i % TILE_COLORS.length]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.listTile}>
                    <Ionicons name="bookmark" size={18} color={colors.white} />
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <RText variant="titleSmall" numberOfLines={1}>{list.title}</RText>
                    <Caption color={colors.textTertiary}>
                      {(list.restaurant_count ?? 0)} {(list.restaurant_count ?? 0) === 1 ? 'place' : 'places'}
                    </Caption>
                  </View>
                  {busyId === list.id ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : list.contains ? (
                    <View style={styles.checkOn}>
                      <Ionicons name="checkmark" size={16} color={colors.white} />
                    </View>
                  ) : (
                    <View style={styles.checkOff} />
                  )}
                </TouchableOpacity>
              ))}

              {(lists ?? []).length === 0 && (
                <View style={styles.emptyLists}>
                  <RText style={{ fontSize: 34, lineHeight: 44 }}>📋</RText>
                  <Caption color={colors.textTertiary} align="center" style={{ marginTop: spacing[2] }}>
                    No lists yet — create your first below.
                  </Caption>
                </View>
              )}
            </ScrollView>
          )}

          {/* Create new list */}
          {creating ? (
            <View style={styles.createRow}>
              <TextInput
                style={styles.input}
                placeholder="New list name"
                placeholderTextColor={colors.textTertiary}
                value={newTitle}
                onChangeText={setNewTitle}
                autoFocus
                maxLength={60}
                returnKeyType="done"
                onSubmitEditing={() => newTitle.trim() && createMutation.mutate()}
              />
              <TouchableOpacity
                style={[styles.createBtn, (!newTitle.trim() || createMutation.isPending) && { opacity: 0.5 }]}
                onPress={() => newTitle.trim() && createMutation.mutate()}
                disabled={!newTitle.trim() || createMutation.isPending}
              >
                {createMutation.isPending
                  ? <ActivityIndicator size="small" color={colors.white} />
                  : <RText variant="labelMedium" color={colors.white}>Create</RText>}
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.newListBtn} onPress={() => setCreating(true)} activeOpacity={0.7}>
              <Ionicons name="add-circle" size={22} color={colors.primary} />
              <RText variant="titleSmall" color={colors.primary} style={{ marginLeft: spacing[2] }}>
                New list
              </RText>
            </TouchableOpacity>
          )}

          <TouchableOpacity onPress={onClose} style={{ marginTop: spacing[4], alignSelf: 'center' }}>
            <RText variant="labelMedium" color={colors.textSecondary}>Done</RText>
          </TouchableOpacity>
        </TouchableOpacity>
      </TouchableOpacity>
      </KeyboardAvoidingView>
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
  subHeader: { flexDirection: 'row', alignItems: 'center', marginTop: spacing[1], marginBottom: spacing[4] },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing[3],
    paddingHorizontal: spacing[3],
    gap: spacing[3],
    borderRadius: radius.xl,
    marginBottom: spacing[1],
  },
  listRowActive: { backgroundColor: colors.primarySurface },
  listTile: {
    width: 44, height: 44, borderRadius: radius.lg,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOn: {
    width: 26, height: 26, borderRadius: 13, backgroundColor: colors.success,
    alignItems: 'center', justifyContent: 'center',
  },
  checkOff: {
    width: 26, height: 26, borderRadius: 13,
    borderWidth: 2, borderColor: colors.gray300,
  },
  emptyLists: { alignItems: 'center', paddingVertical: spacing[6] },
  newListBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing[4], marginTop: spacing[2],
    borderRadius: radius.xl, borderWidth: 1.5, borderColor: colors.primaryLight,
    borderStyle: 'dashed',
  },
  createRow: { flexDirection: 'row', alignItems: 'center', gap: spacing[2], marginTop: spacing[3] },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[3],
    color: colors.textPrimary,
    fontSize: 15,
  },
  createBtn: {
    backgroundColor: colors.primary,
    borderRadius: radius.full,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    minWidth: 72,
    alignItems: 'center',
  },
});
