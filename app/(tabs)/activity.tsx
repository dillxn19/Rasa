import React from 'react';
import {
  View, StyleSheet, TouchableOpacity, FlatList,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formatDistanceToNow } from 'date-fns';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { useAuthStore } from '@/stores/authStore';
import { getNotifications, markNotificationsRead } from '@/services/feed';
import { queryKeys } from '@/lib/queryClient';

const NOTIFICATION_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  follow: 'person-add',
  like_review: 'heart',
  comment: 'chatbubble',
  mention: 'at',
  taste_match: 'sparkles',
  badge_earned: 'ribbon',
  recommendation: 'star',
  friend_review: 'restaurant',
};

export default function ActivityScreen() {
  const { profile } = useAuthStore();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.notifications(profile?.id ?? ''),
    queryFn: () => getNotifications(profile!.id),
    enabled: !!profile,
  });

  const markReadMutation = useMutation({
    mutationFn: (ids?: string[]) => markNotificationsRead(profile!.id, ids),
    onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.notifications(profile?.id ?? '') }),
  });

  const notifications = data?.notifications ?? [];
  const unreadCount = data?.unread_count ?? 0;

  const handleNotificationPress = (notification: (typeof notifications)[0]) => {
    if (!notification.is_read) {
      markReadMutation.mutate([notification.id]);
    }
    const d = notification.data;
    if (d.restaurant_id) router.push(`/restaurant/${d.restaurant_id}`);
    else if (d.follower_id) router.push(`/user/${String(d.follower_id)}`);
    else if (d.username) router.push(`/user/${String(d.username)}`);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <RText variant="h3">Activity</RText>
        {unreadCount > 0 && (
          <TouchableOpacity onPress={() => markReadMutation.mutate(undefined)}>
            <RText variant="labelMedium" color={colors.primary}>Mark all read</RText>
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={notifications}
        keyExtractor={n => n.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[styles.notifRow, !item.is_read && styles.unread]}
            onPress={() => handleNotificationPress(item)}
            activeOpacity={0.7}
          >
            {item.actor ? (
              <Avatar uri={item.actor.avatar_url} name={(item.actor as { display_name?: string }).display_name} size="md" />
            ) : (
              <View style={styles.iconContainer}>
                <Ionicons
                  name={NOTIFICATION_ICONS[item.type] ?? 'notifications'}
                  size={22}
                  color={colors.primary}
                />
              </View>
            )}

            <View style={styles.notifContent}>
              <RText variant="bodyMedium" numberOfLines={2}>{item.title}</RText>
              {item.body && (
                <Caption numberOfLines={1}>{item.body}</Caption>
              )}
              <Caption color={colors.textTertiary}>
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </Caption>
            </View>

            {!item.is_read && <View style={styles.unreadDot} />}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <RText style={{ fontSize: 40 }}>🔔</RText>
            <RText variant="titleLarge" style={{ marginTop: spacing[4] }}>No activity yet</RText>
            <Caption>When friends interact with you, you'll see it here.</Caption>
          </View>
        }
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  notifRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    gap: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  unread: { backgroundColor: colors.primarySurface },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notifContent: { flex: 1, gap: 2 },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    alignSelf: 'center',
  },
  empty: { alignItems: 'center', paddingTop: 100, gap: spacing[3] },
});
