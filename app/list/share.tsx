import React, { useRef } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Share, Dimensions,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import * as Haptics from 'expo-haptics';
import { captureRef } from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';
import * as MediaLibrary from 'expo-media-library';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';
import { queryKeys } from '@/lib/queryClient';
import { getListById } from '@/services/lists';
import { scoreColor } from '@/components/profile/ReviewCard';
import { toast } from '@/stores/toastStore';
import type { List } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_W = Math.min(SCREEN_WIDTH - spacing[4] * 2, 380);

const CATEGORY_EMOJI: Record<string, string> = {
  hawker: '🍜', mamak: '🥛', cafe: '☕', kopitiam: '🍳', fine_dining: '🥂',
  food_court: '🍱', night_market: '🌙', restaurant: '🍽️', fast_food: '🍔', bar: '🍸',
};

export default function ListShareScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const cardRef = useRef<View>(null);

  const { data: list, isLoading } = useQuery<List | null>({
    queryKey: queryKeys.list(listId!),
    queryFn: () => getListById(listId!),
    enabled: !!listId,
  });

  const items = (list?.items ?? []).slice(0, 8);

  const shareImage = async () => {
    if (!cardRef.current) return;
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Share your list' });
      } else {
        await Share.share({ url: uri });
      }
    } catch {
      toast.error('Could not create the image.');
    }
  };

  const saveImage = async () => {
    if (!cardRef.current) return;
    try {
      const { status } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') { toast.error('Allow photo access to save.'); return; }
      const uri = await captureRef(cardRef, { format: 'png', quality: 1 });
      await MediaLibrary.saveToLibraryAsync(uri);
      toast.success('Saved to your photos 📸');
    } catch {
      toast.error('Could not save the image.');
    }
  };

  if (isLoading || !list) {
    return (
      <View style={[styles.container, styles.center]}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Ionicons name="chevron-down" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <RText variant="titleMedium">Share list</RText>
        <View style={styles.headerBtn} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Capturable infographic card */}
        <View ref={cardRef} collapsable={false} style={styles.card}>
          <LinearGradient colors={[colors.primary, '#8B1E1E']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.cardInner}>
            <View style={styles.cardTop}>
              <RText style={styles.brand}>RASA</RText>
              <RText style={styles.kicker}>{(list.restaurant_count ?? items.length)} PLACES</RText>
            </View>

            <RText style={styles.title} numberOfLines={3}>{list.title}</RText>
            {list.user && (
              <Caption color={colors.whiteTransparent90} style={{ marginTop: spacing[1] }}>
                by @{list.user.username}
              </Caption>
            )}

            <View style={{ marginTop: spacing[5], gap: spacing[3] }}>
              {items.map((item, i) => {
                const r: any = item.restaurant;
                if (!r) return null;
                return (
                  <View key={item.id} style={styles.itemRow}>
                    <RText style={styles.rank}>{i + 1}</RText>
                    {r.cover_photo_url ? (
                      <Image source={{ uri: r.cover_photo_url }} style={styles.thumb} contentFit="cover" />
                    ) : (
                      <View style={[styles.thumb, styles.thumbFallback]}>
                        <RText style={{ fontSize: 20, lineHeight: 26 }}>{CATEGORY_EMOJI[r.category ?? 'restaurant'] ?? '🍽️'}</RText>
                      </View>
                    )}
                    <View style={{ flex: 1, marginHorizontal: spacing[3] }}>
                      <RText variant="titleSmall" color={colors.white} numberOfLines={1}>{r.name}</RText>
                      {r.area || r.city ? (
                        <Caption color={colors.whiteTransparent80} numberOfLines={1}>{r.area || r.city}</Caption>
                      ) : null}
                    </View>
                    {r.overall_rating > 0 && (
                      <View style={[styles.scoreBadge, { backgroundColor: scoreColor(r.overall_rating) }]}>
                        <RText style={styles.scoreText}>
                          {r.overall_rating % 1 === 0 ? r.overall_rating.toFixed(0) : r.overall_rating.toFixed(1)}
                        </RText>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {items.length === 0 && (
              <Caption color={colors.whiteTransparent80} align="center" style={{ marginVertical: spacing[8] }}>
                Add some places to your list first.
              </Caption>
            )}

            <RText style={styles.footer}>Find it on Rasa · rasa.my</RText>
          </LinearGradient>
        </View>
      </ScrollView>

      {/* Actions */}
      <View style={styles.actions}>
        <TouchableOpacity style={[styles.actionBtn, styles.actionOutline]} onPress={saveImage} activeOpacity={0.85}>
          <Ionicons name="download-outline" size={18} color={colors.primary} />
          <RText style={[styles.actionText, { color: colors.primary }]}>Save</RText>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={shareImage} activeOpacity={0.9} disabled={items.length === 0}>
          <Ionicons name="share-social" size={18} color={colors.white} />
          <RText style={[styles.actionText, { color: colors.white }]}>Share</RText>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { alignItems: 'center', justifyContent: 'center' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing[4], paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border,
  },
  headerBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  scroll: { alignItems: 'center', padding: spacing[4] },
  card: { width: CARD_W, borderRadius: radius['2xl'], overflow: 'hidden' },
  cardInner: { padding: spacing[5] },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { color: colors.white, fontSize: 20, fontWeight: '900', letterSpacing: 2 },
  kicker: { color: colors.whiteTransparent90, fontSize: 12, fontWeight: '800', letterSpacing: 1 },
  title: { color: colors.white, fontSize: 30, lineHeight: 34, fontWeight: '900', letterSpacing: -0.5, marginTop: spacing[4] },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  rank: { color: colors.whiteTransparent80, fontSize: 18, fontWeight: '900', width: 20, textAlign: 'center' },
  thumb: { width: 46, height: 46, borderRadius: radius.md, marginLeft: spacing[2], backgroundColor: 'rgba(255,255,255,0.15)' },
  thumbFallback: { alignItems: 'center', justifyContent: 'center' },
  scoreBadge: { minWidth: 38, height: 38, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing[1] },
  scoreText: { color: colors.white, fontSize: 16, fontWeight: '800' },
  footer: { color: colors.whiteTransparent80, fontSize: 12, fontWeight: '600', textAlign: 'center', marginTop: spacing[6] },
  actions: {
    flexDirection: 'row', gap: spacing[3],
    paddingHorizontal: spacing[4], paddingTop: spacing[3],
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.border,
  },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.primary, paddingVertical: spacing[4], borderRadius: radius.xl,
  },
  actionOutline: { backgroundColor: 'transparent', borderWidth: 1.5, borderColor: colors.primary },
  actionText: { fontSize: 15, fontWeight: '700', marginLeft: spacing[2] },
});
