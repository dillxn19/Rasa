import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, Dimensions, ScrollView } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing } from '@/theme';
import { RText } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { ReportSheet } from '@/components/ui/ReportSheet';
import type { CommunityPhoto } from '@/services/restaurants';

const { width: W, height: H } = Dimensions.get('window');

/**
 * Full-screen, swipeable community-photo viewer with uploader attribution and
 * a report action (reports the underlying review). Opened from the restaurant
 * page photo strip.
 */
export function PhotoViewerModal({
  visible,
  photos,
  initialIndex,
  reporterId,
  onClose,
}: {
  visible: boolean;
  photos: CommunityPhoto[];
  initialIndex: number;
  reporterId: string;
  onClose: () => void;
}) {
  const [index, setIndex] = useState(initialIndex);
  const [showReport, setShowReport] = useState(false);

  const current = photos[index];

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.container}>
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: initialIndex * W, y: 0 }}
          onMomentumScrollEnd={(e) => setIndex(Math.round(e.nativeEvent.contentOffset.x / W))}
        >
          {photos.map((p, i) => (
            <View key={`${p.reviewId}-${i}`} style={styles.page}>
              <Image source={{ uri: p.url }} style={styles.image} contentFit="contain" transition={150} />
            </View>
          ))}
        </ScrollView>

        {/* Top bar */}
        <View style={styles.topBar}>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="close" size={26} color={colors.white} />
          </TouchableOpacity>
          <RText variant="labelMedium" color={colors.white}>
            {index + 1} / {photos.length}
          </RText>
          <TouchableOpacity onPress={() => setShowReport(true)} hitSlop={12} style={styles.iconBtn}>
            <Ionicons name="flag-outline" size={22} color={colors.white} />
          </TouchableOpacity>
        </View>

        {/* Uploader attribution */}
        {current?.username && (
          <TouchableOpacity
            style={styles.uploader}
            activeOpacity={0.8}
            onPress={() => { onClose(); router.push(`/user/${current.username}`); }}
          >
            <Avatar uri={current.avatarUrl} name={current.username} size="sm" />
            <RText variant="titleSmall" color={colors.white} style={{ marginLeft: spacing[2] }}>
              @{current.username}
            </RText>
          </TouchableOpacity>
        )}
      </View>

      {current && (
        <ReportSheet
          visible={showReport}
          target={{ reporterId, reviewId: current.reviewId }}
          targetLabel="this photo"
          onClose={() => setShowReport(false)}
        />
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  page: { width: W, height: H, alignItems: 'center', justifyContent: 'center' },
  image: { width: W, height: H },
  topBar: {
    position: 'absolute', top: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingTop: spacing[12], paddingHorizontal: spacing[4], paddingBottom: spacing[3],
  },
  iconBtn: { padding: spacing[1] },
  uploader: {
    position: 'absolute', bottom: spacing[12], left: spacing[4],
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 999,
    paddingVertical: spacing[2], paddingHorizontal: spacing[3],
  },
});
