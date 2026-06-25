import React, { useState } from 'react';
import {
  View, StyleSheet, ScrollView, TextInput,
  TouchableOpacity, Alert, Image as RNImage,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { colors, spacing, radius } from '@/theme';
import { RText, H3, Caption } from '@/components/ui/Text';
import { Button } from '@/components/ui/Button';
import { RatingPicker } from '@/components/ui/StarRating';
import { useAuthStore } from '@/stores/authStore';
import { submitReview } from '@/services/restaurants';
import { uploadReviewPhoto } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';

// In production: restaurant picker would use Algolia search
const QUICK_RECENT_RESTAURANTS = [
  { id: '1', name: 'Village Park Restaurant', category: 'hawker' },
  { id: '2', name: 'Burger Lab', category: 'restaurant' },
  { id: '3', name: 'Kin Kin Chilli Pan Mee', category: 'restaurant' },
];

export default function AddReviewScreen() {
  const { profile } = useAuthStore();
  const qc = useQueryClient();

  const [restaurantId, setRestaurantId] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [isPublic, setIsPublic] = useState(true);

  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!profile || !restaurantId || rating === 0) return;
      await submitReview({
        restaurant_id: restaurantId,
        rating,
        content: content.trim() || undefined,
        photos,
        is_public: isPublic,
      });
    },
    onSuccess: () => {
      Alert.alert('Review posted!', 'Your review has been shared with your followers.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
      qc.invalidateQueries({ queryKey: queryKeys.homeFeed() });
    },
    onError: () => Alert.alert('Error', 'Failed to post review. Please try again.'),
  });

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 5,
    });

    if (!result.canceled && profile) {
      for (const asset of result.assets) {
        const response = await fetch(asset.uri);
        const blob = await response.blob();
        const url = await uploadReviewPhoto(profile.id, blob);
        setPhotos(prev => [...prev, url]);
      }
    }
  };

  const canSubmit = restaurantId && rating > 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <H3>Rate a restaurant</H3>
        <Button
          label="Post"
          size="sm"
          onPress={() => submitMutation.mutate()}
          isDisabled={!canSubmit}
          isLoading={submitMutation.isPending}
        />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        {/* Restaurant picker */}
        <View style={styles.section}>
          <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
            RESTAURANT
          </RText>
          {restaurantId ? (
            <View style={styles.selectedRestaurant}>
              <View style={styles.restaurantIcon}>
                <Ionicons name="restaurant" size={20} color={colors.primary} />
              </View>
              <RText variant="titleMedium" style={{ flex: 1 }}>{restaurantName}</RText>
              <TouchableOpacity onPress={() => { setRestaurantId(''); setRestaurantName(''); }}>
                <Ionicons name="close-circle" size={20} color={colors.textTertiary} />
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <View style={styles.searchBar}>
                <Ionicons name="search" size={18} color={colors.textTertiary} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search restaurants..."
                  placeholderTextColor={colors.textTertiary}
                />
              </View>
              <View style={styles.recentList}>
                <Caption color={colors.textTertiary}>Recent restaurants</Caption>
                {QUICK_RECENT_RESTAURANTS.map(r => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.recentRow}
                    onPress={() => { setRestaurantId(r.id); setRestaurantName(r.name); }}
                  >
                    <View style={styles.restaurantIcon}>
                      <Ionicons name="restaurant" size={18} color={colors.textSecondary} />
                    </View>
                    <View>
                      <RText variant="titleSmall">{r.name}</RText>
                      <Caption>{r.category}</Caption>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </>
          )}
        </View>

        {/* Rating */}
        <View style={[styles.section, styles.ratingSection]}>
          <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
            YOUR RATING
          </RText>
          <RatingPicker value={rating} onChange={setRating} />
        </View>

        {/* Review text */}
        <View style={styles.section}>
          <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
            REVIEW <Caption>(optional)</Caption>
          </RText>
          <TextInput
            style={styles.reviewInput}
            value={content}
            onChangeText={setContent}
            placeholder="What did you think? Keep it honest and helpful..."
            placeholderTextColor={colors.textTertiary}
            multiline
            numberOfLines={5}
            maxLength={500}
            textAlignVertical="top"
          />
          <Caption color={colors.textTertiary} align="right">{content.length}/500</Caption>
        </View>

        {/* Photos */}
        <View style={styles.section}>
          <RText variant="labelMedium" color={colors.textSecondary} style={styles.label}>
            PHOTOS <Caption>(optional)</Caption>
          </RText>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <TouchableOpacity style={styles.addPhotoBtn} onPress={pickImage}>
              <Ionicons name="camera-outline" size={28} color={colors.textTertiary} />
              <Caption>Add photos</Caption>
            </TouchableOpacity>
            {photos.map((photo, i) => (
              <View key={i} style={styles.photoThumbnail}>
                <RNImage source={{ uri: photo }} style={styles.photoThumb} />
                <TouchableOpacity
                  style={styles.removePhoto}
                  onPress={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}
                >
                  <Ionicons name="close-circle" size={20} color={colors.white} />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>

        {/* Privacy */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.privacyRow}
            onPress={() => setIsPublic(!isPublic)}
          >
            <Ionicons
              name={isPublic ? 'globe-outline' : 'lock-closed-outline'}
              size={20}
              color={colors.textSecondary}
            />
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <RText variant="titleSmall">{isPublic ? 'Public' : 'Private'}</RText>
              <Caption>{isPublic ? 'Visible to everyone' : 'Only visible to you'}</Caption>
            </View>
            <View style={[styles.toggle, isPublic && styles.toggleActive]}>
              <View style={[styles.toggleThumb, isPublic && styles.toggleThumbActive]} />
            </View>
          </TouchableOpacity>
        </View>
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
  content: { flex: 1 },
  section: {
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
    gap: spacing[3],
  },
  ratingSection: { alignItems: 'center' },
  label: { textTransform: 'uppercase', letterSpacing: 0.5 },
  selectedRestaurant: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.primarySurface,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.primary,
    gap: spacing[3],
  },
  restaurantIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.xl,
    backgroundColor: colors.primarySurface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    gap: spacing[2],
  },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary },
  recentList: { gap: spacing[3] },
  recentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing[3],
    paddingVertical: spacing[2],
  },
  reviewInput: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: 15,
    color: colors.textPrimary,
    backgroundColor: colors.gray50,
    minHeight: 120,
  },
  addPhotoBtn: {
    width: 90,
    height: 90,
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing[3],
    gap: spacing[1],
  },
  photoThumbnail: { width: 90, height: 90, marginRight: spacing[3], position: 'relative' },
  photoThumb: { width: 90, height: 90, borderRadius: radius.xl },
  removePhoto: { position: 'absolute', top: -6, right: -6 },
  privacyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    backgroundColor: colors.gray50,
    borderRadius: radius.xl,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.gray300,
    padding: 2,
  },
  toggleActive: { backgroundColor: colors.primary },
  toggleThumb: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  toggleThumbActive: { transform: [{ translateX: 18 }] },
});
