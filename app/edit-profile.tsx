import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { colors, spacing, radius } from '@/theme';
import { RText, H3, Caption } from '@/components/ui/Text';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { useAuthStore } from '@/stores/authStore';
import { uploadAvatar } from '@/lib/supabase';
import { MALAYSIA_CITIES } from '@/types';

export default function EditProfileScreen() {
  const { profile, updateProfile } = useAuthStore();

  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [city, setCity] = useState(profile?.city ?? 'Kuala Lumpur');
  const [avatarUri, setAvatarUri] = useState<string | null>(profile?.avatar_url ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [showCityPicker, setShowCityPicker] = useState(false);

  const handlePickAvatar = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setAvatarUri(result.assets[0].uri);
    }
  };

  const handleSave = async () => {
    if (!displayName.trim()) {
      Alert.alert('Required', 'Display name cannot be empty.');
      return;
    }
    if (!profile) return;
    setIsLoading(true);
    try {
      let avatarUrl = profile.avatar_url;

      // Upload new avatar if changed
      if (avatarUri && avatarUri !== profile.avatar_url) {
        const response = await fetch(avatarUri);
        const blob = await response.blob();
        avatarUrl = await uploadAvatar(profile.id, blob);
      }

      await updateProfile({
        display_name: displayName.trim(),
        bio: bio.trim() || null,
        city,
        avatar_url: avatarUrl,
      });

      router.back();
    } catch (e) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
            <Ionicons name="close" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <H3>Edit Profile</H3>
          <TouchableOpacity onPress={handleSave} disabled={isLoading} style={styles.headerBtn}>
            <RText variant="labelMedium" color={isLoading ? colors.textTertiary : colors.primary}>
              Save
            </RText>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Avatar picker */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickAvatar} style={styles.avatarWrapper}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImg} contentFit="cover" />
              ) : (
                <Avatar uri={null} name={profile?.display_name} size="2xl" />
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={14} color={colors.white} />
              </View>
            </TouchableOpacity>
            <Caption color={colors.textSecondary} style={{ marginTop: spacing[2] }}>
              Tap to change photo
            </Caption>
          </View>

          <View style={styles.form}>
            <Field label="Display Name" required>
              <TextInput
                style={styles.input}
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                placeholderTextColor={colors.textTertiary}
                maxLength={50}
              />
            </Field>

            <Field label="Bio">
              <TextInput
                style={[styles.input, styles.bioInput]}
                value={bio}
                onChangeText={setBio}
                placeholder="Tell people about your food journey..."
                placeholderTextColor={colors.textTertiary}
                multiline
                maxLength={200}
                textAlignVertical="top"
              />
              <Caption color={colors.textTertiary} style={{ marginTop: 4, textAlign: 'right' }}>
                {bio.length}/200
              </Caption>
            </Field>

            <Field label="City">
              <TouchableOpacity
                style={[styles.input, styles.selectInput]}
                onPress={() => setShowCityPicker(!showCityPicker)}
              >
                <RText color={colors.textPrimary}>{city}</RText>
                <Ionicons name={showCityPicker ? 'chevron-up' : 'chevron-down'} size={18} color={colors.textTertiary} />
              </TouchableOpacity>
              {showCityPicker && (
                <View style={styles.cityDropdown}>
                  {MALAYSIA_CITIES.map(c => (
                    <TouchableOpacity
                      key={c}
                      style={[styles.cityOption, c === city && styles.cityOptionActive]}
                      onPress={() => { setCity(c); setShowCityPicker(false); }}
                    >
                      <RText
                        variant="bodyMedium"
                        color={c === city ? colors.primary : colors.textPrimary}
                        style={c === city ? { fontWeight: '700' } : undefined}
                      >
                        {c}
                      </RText>
                      {c === city && <Ionicons name="checkmark" size={16} color={colors.primary} />}
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </Field>
          </View>

          <View style={{ paddingHorizontal: spacing[4], paddingBottom: spacing[10] }}>
            <Button
              label={isLoading ? 'Saving...' : 'Save Changes'}
              onPress={handleSave}
              fullWidth
              variant="primary"
              size="lg"
              isLoading={isLoading}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <View style={styles.fieldLabel}>
        <Caption color={colors.textSecondary} style={{ textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: '600' }}>
          {label}
        </Caption>
        {required && <Caption color={colors.primary}> *</Caption>}
      </View>
      {children}
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
  headerBtn: { padding: spacing[1], minWidth: 44 },

  avatarSection: {
    alignItems: 'center',
    paddingVertical: spacing[6],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  avatarWrapper: { position: 'relative' },
  avatarImg: { width: 88, height: 88, borderRadius: 44 },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: colors.background,
  },

  form: { padding: spacing[4], gap: spacing[5] },
  field: { gap: spacing[2] },
  fieldLabel: { flexDirection: 'row', alignItems: 'center' },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.gray50,
  },
  bioInput: { minHeight: 90, paddingTop: spacing[4] },
  selectInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  cityDropdown: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.background,
    overflow: 'hidden',
    marginTop: 4,
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  cityOptionActive: { backgroundColor: colors.primarySurface },
});
