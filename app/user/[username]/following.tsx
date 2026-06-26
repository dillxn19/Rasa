import React from 'react';
import {
  View, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption, H3 } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { getUserByUsername, getUserFollowing, followUser, unfollowUser } from '@/services/users';
import { queryKeys } from '@/lib/queryClient';
import { TASTE_PROFILE_LABELS } from '@/types';
import type { User } from '@/types';

export default function FollowingScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { profile: currentUser } = useAuthStore();
  const qc = useQueryClient();

  const { data: profileUser } = useQuery({
    queryKey: queryKeys.user(username),
    queryFn: () => getUserByUsername(username, currentUser?.id),
    enabled: !!username,
  });

  const { data: following, isLoading } = useQuery({
    queryKey: queryKeys.userFollowing(profileUser?.id ?? ''),
    queryFn: () => getUserFollowing(profileUser!.id),
    enabled: !!profileUser,
  });

  const followMutation = useMutation({
    mutationFn: async ({ userId, isFollowing }: { userId: string; isFollowing: boolean }) => {
      if (!currentUser) return;
      if (isFollowing) await unfollowUser(currentUser.id, userId);
      else await followUser(currentUser.id, userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.userFollowing(profileUser?.id ?? '') });
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    },
  });

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </TouchableOpacity>
        <H3>{username} Follows</H3>
        <View style={{ width: 40 }} />
      </View>

      {isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={following ?? []}
          keyExtractor={u => u.id}
          renderItem={({ item }) => (
            <UserRow
              user={item}
              isOwnProfile={item.id === currentUser?.id}
              onFollowToggle={() => followMutation.mutate({
                userId: item.id,
                isFollowing: !!item.is_following,
              })}
            />
          )}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <RText style={{ fontSize: 40 }}>👀</RText>
              <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>Not following anyone</RText>
              <Caption color={colors.textSecondary}>
                {username} hasn't followed anyone yet.
              </Caption>
            </View>
          }
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.list}
        />
      )}
    </SafeAreaView>
  );
}

function UserRow({
  user, isOwnProfile, onFollowToggle,
}: {
  user: User;
  isOwnProfile: boolean;
  onFollowToggle: () => void;
}) {
  const tasteProfile = user.taste_profile ? TASTE_PROFILE_LABELS[user.taste_profile] : null;

  return (
    <TouchableOpacity
      style={styles.userRow}
      onPress={() => router.push(`/user/${user.username}`)}
      activeOpacity={0.85}
    >
      <Avatar uri={user.avatar_url} name={user.display_name} size="md" />
      <View style={styles.userInfo}>
        <View style={styles.nameRow}>
          <RText variant="titleSmall" numberOfLines={1} style={{ flex: 1 }}>
            {user.display_name}
          </RText>
          {user.is_verified && (
            <Ionicons name="checkmark-circle" size={14} color={colors.primary} style={{ marginLeft: 4 }} />
          )}
        </View>
        <Caption color={colors.textSecondary}>@{user.username} · {user.city}</Caption>
        {tasteProfile && (
          <View style={styles.tasteChip}>
            <RText style={{ fontSize: 11 }}>{tasteProfile.emoji}</RText>
            <Caption color={colors.primary} style={{ marginLeft: 3, fontWeight: '600' }}>
              {tasteProfile.label}
            </Caption>
          </View>
        )}
      </View>
      {!isOwnProfile && (
        <TouchableOpacity
          style={[styles.followBtn, user.is_following && styles.followingBtn]}
          onPress={onFollowToggle}
        >
          <RText
            variant="labelSmall"
            color={user.is_following ? colors.textPrimary : colors.white}
            style={{ fontWeight: '700' }}
          >
            {user.is_following ? 'Following' : 'Follow'}
          </RText>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
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
  backBtn: { padding: spacing[1] },
  list: { paddingBottom: spacing[10] },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  userInfo: { flex: 1, gap: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center' },
  tasteChip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  followBtn: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[2],
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  followingBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingState: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  emptyState: {
    alignItems: 'center',
    paddingTop: 100,
    paddingHorizontal: spacing[8],
    gap: spacing[3],
  },
});
