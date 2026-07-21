import React, { useState } from 'react';
import {
  View, StyleSheet, TextInput, TouchableOpacity, FlatList,
  KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { getComments, addComment, type Comment } from '@/services/comments';
import { toast } from '@/stores/toastStore';

export default function CommentsScreen() {
  const { id: reviewId } = useLocalSearchParams<{ id: string }>();
  const { profile } = useAuthStore();
  const qc = useQueryClient();
  const [text, setText] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['comments', reviewId],
    queryFn: () => getComments(reviewId),
    enabled: !!reviewId,
  });

  const addMutation = useMutation({
    mutationFn: () => addComment(profile!.id, reviewId, text),
    onSuccess: () => {
      setText('');
      Haptics.selectionAsync().catch(() => {});
      qc.invalidateQueries({ queryKey: ['comments', reviewId] });
      qc.invalidateQueries({ queryKey: ['feed', 'home'] });
    },
    onError: () => toast.error('Could not post your comment. Try again.'),
  });

  const canSend = text.trim().length > 0 && !addMutation.isPending;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="titleMedium">Comments</RText>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        {isLoading ? (
          <ActivityIndicator color={colors.primary} style={{ marginTop: spacing[10] }} />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(c) => c.id}
            renderItem={({ item }) => <CommentRow comment={item} />}
            contentContainerStyle={styles.list}
            ListEmptyComponent={
              <View style={styles.empty}>
                <RText style={{ fontSize: 40, lineHeight: 50 }}>💬</RText>
                <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>No comments yet</RText>
                <Caption color={colors.textSecondary}>Be the first to say something</Caption>
              </View>
            }
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* Composer */}
        <View style={styles.composer}>
          <Avatar uri={profile?.avatar_url} name={profile?.display_name} size="sm" />
          <TextInput
            style={styles.input}
            placeholder="Add a comment..."
            placeholderTextColor={colors.textTertiary}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            disabled={!canSend}
            onPress={() => addMutation.mutate()}
            style={[styles.sendBtn, { opacity: canSend ? 1 : 0.4 }]}
          >
            {addMutation.isPending
              ? <ActivityIndicator size="small" color={colors.white} />
              : <Ionicons name="arrow-up" size={20} color={colors.white} />}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function CommentRow({ comment }: { comment: Comment }) {
  const timeAgo = formatDistanceToNow(new Date(comment.created_at), { addSuffix: true });
  return (
    <View style={styles.row}>
      <TouchableOpacity onPress={() => comment.user && router.push(`/user/${comment.user.username}`)}>
        <Avatar uri={comment.user?.avatar_url} name={comment.user?.display_name} size="sm" />
      </TouchableOpacity>
      <View style={{ flex: 1, marginLeft: spacing[3] }}>
        <View style={styles.rowHeader}>
          <RText variant="titleSmall">{comment.user?.display_name ?? 'Someone'}</RText>
          <Caption color={colors.textTertiary}>{timeAgo}</Caption>
        </View>
        <RText variant="bodyMedium" color={colors.textPrimary} style={{ marginTop: 2 }}>
          {comment.content}
        </RText>
      </View>
    </View>
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
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  list: { padding: spacing[4], flexGrow: 1 },
  empty: { alignItems: 'center', paddingTop: spacing[16], gap: spacing[1] },
  row: { flexDirection: 'row', marginBottom: spacing[5] },
  rowHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing[3],
    backgroundColor: colors.surface,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.gray100,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2] + 2,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
