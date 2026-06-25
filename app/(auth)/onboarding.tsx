import React, { useState, useRef } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  interpolate,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius, typography } from '@/theme';
import { Button } from '@/components/ui/Button';
import { RText, H2, Body, Caption } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import {
  CuisineType, DietaryOption, CUISINE_LABELS, DIETARY_LABELS, MALAYSIA_CITIES,
} from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 4;

const CUISINES: CuisineType[] = [
  'malay', 'chinese', 'indian', 'mamak', 'nyonya',
  'japanese', 'korean', 'western', 'thai', 'seafood',
  'vegetarian', 'dessert', 'cafe', 'hawker',
];

const DIETARY: DietaryOption[] = [
  'halal_certified', 'muslim_friendly', 'pork_free',
  'vegetarian', 'vegan', 'gluten_free',
];

export default function OnboardingScreen() {
  const { profile, refreshProfile } = useAuthStore();
  const [step, setStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [username, setUsername] = useState(profile?.username ?? '');
  const [bio, setBio] = useState('');
  const [city, setCity] = useState('Kuala Lumpur');
  const [selectedCuisines, setSelectedCuisines] = useState<CuisineType[]>([]);
  const [selectedDietary, setSelectedDietary] = useState<DietaryOption[]>([]);

  const progress = useSharedValue(0);

  const progressStyle = useAnimatedStyle(() => ({
    width: `${((step + 1) / TOTAL_STEPS) * 100}%`,
  }));

  const nextStep = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(s => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep(s => s - 1);
  };

  const toggleCuisine = (cuisine: CuisineType) => {
    setSelectedCuisines(prev =>
      prev.includes(cuisine) ? prev.filter(c => c !== cuisine) : [...prev, cuisine]
    );
  };

  const toggleDietary = (option: DietaryOption) => {
    setSelectedDietary(prev =>
      prev.includes(option) ? prev.filter(d => d !== option) : [...prev, option]
    );
  };

  const handleComplete = async () => {
    if (!profile) return;
    setIsLoading(true);
    try {
      await supabase
        .from('users')
        .update({
          display_name: displayName.trim(),
          username: username.toLowerCase().trim(),
          bio: bio.trim() || null,
          city,
          favorite_cuisines: selectedCuisines,
          dietary_preferences: selectedDietary,
          onboarding_completed: true,
        })
        .eq('id', profile.id);

      await refreshProfile();
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save profile. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const steps = [
    <StepProfile
      displayName={displayName}
      username={username}
      bio={bio}
      onDisplayNameChange={setDisplayName}
      onUsernameChange={setUsername}
      onBioChange={setBio}
    />,
    <StepCity city={city} onCityChange={setCity} />,
    <StepCuisines selected={selectedCuisines} onToggle={toggleCuisine} />,
    <StepDietary selected={selectedDietary} onToggle={toggleDietary} />,
  ];

  const stepTitles = [
    'Create your profile',
    'Where are you based?',
    'What cuisines do you love?',
    'Any dietary preferences?',
  ];

  const stepSubtitles = [
    'Tell the community about yourself',
    'We\'ll find restaurants near you',
    'Pick all that apply — we\'ll personalise your feed',
    'Skip if none apply',
  ];

  const canProceed = [
    displayName.length >= 2 && username.length >= 3,
    city.length > 0,
    selectedCuisines.length > 0,
    true,
  ];

  return (
    <SafeAreaView style={styles.container}>
      {/* Progress bar */}
      <View style={styles.progressTrack}>
        <Animated.View style={[styles.progressFill, progressStyle]} />
      </View>

      {/* Header */}
      <View style={styles.header}>
        {step > 0 && (
          <TouchableOpacity onPress={prevStep} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
          </TouchableOpacity>
        )}
        <View style={styles.headerTitle}>
          <Caption color={colors.primary} style={{ fontWeight: '700', textTransform: 'uppercase', letterSpacing: 1 }}>
            Step {step + 1} of {TOTAL_STEPS}
          </Caption>
          <H2>{stepTitles[step]}</H2>
          <Body color={colors.textSecondary}>{stepSubtitles[step]}</Body>
        </View>
      </View>

      {/* Step content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {steps[step]}
      </ScrollView>

      {/* Footer */}
      <View style={styles.footer}>
        {step < TOTAL_STEPS - 1 ? (
          <Button
            label="Continue"
            onPress={nextStep}
            fullWidth
            size="lg"
            isDisabled={!canProceed[step]}
          />
        ) : (
          <Button
            label="Start exploring"
            onPress={handleComplete}
            fullWidth
            size="lg"
            isLoading={isLoading}
          />
        )}

        {step === TOTAL_STEPS - 1 && (
          <TouchableOpacity style={styles.skipBtn} onPress={handleComplete}>
            <RText variant="bodyMedium" color={colors.textSecondary}>Skip for now</RText>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function StepProfile({
  displayName, username, bio,
  onDisplayNameChange, onUsernameChange, onBioChange,
}: {
  displayName: string; username: string; bio: string;
  onDisplayNameChange: (v: string) => void;
  onUsernameChange: (v: string) => void;
  onBioChange: (v: string) => void;
}) {
  return (
    <View style={styles.stepContent}>
      <TouchableOpacity style={styles.avatarPicker}>
        <View style={styles.avatarCircle}>
          <Ionicons name="camera" size={28} color={colors.primary} />
        </View>
        <Caption style={{ marginTop: spacing[2] }}>Add photo</Caption>
      </TouchableOpacity>

      <View style={styles.fieldGroup}>
        <RText variant="labelMedium" color={colors.textSecondary} style={styles.fieldLabel}>
          Display name
        </RText>
        <TextInput
          style={styles.input}
          value={displayName}
          onChangeText={onDisplayNameChange}
          placeholder="Your name"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="words"
          returnKeyType="next"
        />
      </View>

      <View style={styles.fieldGroup}>
        <RText variant="labelMedium" color={colors.textSecondary} style={styles.fieldLabel}>
          Username
        </RText>
        <View style={styles.usernameContainer}>
          <RText variant="bodyMedium" color={colors.textTertiary} style={styles.atSign}>@</RText>
          <TextInput
            style={[styles.input, styles.usernameInput]}
            value={username}
            onChangeText={v => onUsernameChange(v.toLowerCase().replace(/[^a-z0-9_.]/g, ''))}
            placeholder="your_username"
            placeholderTextColor={colors.textTertiary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </View>
      </View>

      <View style={styles.fieldGroup}>
        <RText variant="labelMedium" color={colors.textSecondary} style={styles.fieldLabel}>
          Bio <Caption>(optional)</Caption>
        </RText>
        <TextInput
          style={[styles.input, styles.bioInput]}
          value={bio}
          onChangeText={onBioChange}
          placeholder="Tell people about your food journey..."
          placeholderTextColor={colors.textTertiary}
          multiline
          numberOfLines={3}
          maxLength={160}
          textAlignVertical="top"
        />
        <Caption color={colors.textTertiary} align="right">{bio.length}/160</Caption>
      </View>
    </View>
  );
}

function StepCity({ city, onCityChange }: { city: string; onCityChange: (v: string) => void }) {
  return (
    <View style={styles.stepContent}>
      {MALAYSIA_CITIES.map(c => (
        <TouchableOpacity
          key={c}
          style={[styles.cityOption, city === c && styles.cityOptionSelected]}
          onPress={() => onCityChange(c)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="location-outline"
            size={18}
            color={city === c ? colors.primary : colors.textSecondary}
          />
          <RText
            variant="titleMedium"
            color={city === c ? colors.primary : colors.textPrimary}
            style={{ marginLeft: spacing[3], flex: 1 }}
          >
            {c}
          </RText>
          {city === c && (
            <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
          )}
        </TouchableOpacity>
      ))}
    </View>
  );
}

function StepCuisines({
  selected, onToggle,
}: {
  selected: CuisineType[];
  onToggle: (c: CuisineType) => void;
}) {
  const CUISINE_EMOJIS: Partial<Record<CuisineType, string>> = {
    malay: '🍛', chinese: '🥡', indian: '🫓', mamak: '☕', nyonya: '🦐',
    japanese: '🍣', korean: '🥩', western: '🍔', thai: '🍜',
    seafood: '🦞', vegetarian: '🥗', dessert: '🧁', cafe: '☕', hawker: '🍜',
  };

  return (
    <View style={styles.stepContent}>
      <View style={styles.chipGrid}>
        {CUISINES.map(cuisine => {
          const isSelected = selected.includes(cuisine);
          return (
            <TouchableOpacity
              key={cuisine}
              style={[styles.cuisineChip, isSelected && styles.cuisineChipSelected]}
              onPress={() => onToggle(cuisine)}
              activeOpacity={0.7}
            >
              <RText style={{ fontSize: 18 }}>{CUISINE_EMOJIS[cuisine] ?? '🍴'}</RText>
              <RText
                variant="labelMedium"
                color={isSelected ? colors.white : colors.textPrimary}
                style={{ marginTop: 4 }}
              >
                {CUISINE_LABELS[cuisine]}
              </RText>
            </TouchableOpacity>
          );
        })}
      </View>
      {selected.length > 0 && (
        <Caption color={colors.primary} align="center" style={{ marginTop: spacing[4] }}>
          {selected.length} selected
        </Caption>
      )}
    </View>
  );
}

function StepDietary({
  selected, onToggle,
}: {
  selected: DietaryOption[];
  onToggle: (d: DietaryOption) => void;
}) {
  const DIETARY_EMOJIS: Record<DietaryOption, string> = {
    halal_certified: '☪️',
    muslim_friendly: '🕌',
    pork_free: '🚫🐷',
    vegetarian: '🥗',
    vegan: '🌱',
    gluten_free: '🌾',
    nut_free: '🥜',
  };

  return (
    <View style={styles.stepContent}>
      {DIETARY.map(option => {
        const isSelected = selected.includes(option);
        return (
          <TouchableOpacity
            key={option}
            style={[styles.dietaryOption, isSelected && styles.dietaryOptionSelected]}
            onPress={() => onToggle(option)}
            activeOpacity={0.7}
          >
            <RText style={{ fontSize: 24 }}>{DIETARY_EMOJIS[option]}</RText>
            <View style={{ flex: 1, marginLeft: spacing[4] }}>
              <RText
                variant="titleMedium"
                color={isSelected ? colors.primary : colors.textPrimary}
              >
                {DIETARY_LABELS[option]}
              </RText>
            </View>
            {isSelected ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.primary} />
            ) : (
              <View style={styles.unchecked} />
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressTrack: {
    height: 3,
    backgroundColor: colors.gray100,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: radius.full,
  },
  header: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[6],
    paddingBottom: spacing[4],
  },
  backBtn: {
    marginBottom: spacing[4],
    padding: spacing[1],
    alignSelf: 'flex-start',
  },
  headerTitle: {
    gap: spacing[1],
  },
  content: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: spacing[6],
    paddingBottom: spacing[8],
    gap: spacing[3],
  },
  stepContent: {
    paddingHorizontal: spacing[6],
    paddingTop: spacing[2],
    paddingBottom: spacing[10],
    gap: spacing[3],
  },
  avatarPicker: {
    alignItems: 'center',
    marginBottom: spacing[4],
  },
  avatarCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.gray50,
  },
  fieldGroup: {
    gap: spacing[2],
  },
  fieldLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    fontSize: 16,
    color: colors.textPrimary,
    backgroundColor: colors.gray50,
  },
  usernameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    backgroundColor: colors.gray50,
    overflow: 'hidden',
  },
  atSign: {
    paddingLeft: spacing[4],
  },
  usernameInput: {
    flex: 1,
    borderWidth: 0,
    marginLeft: 2,
  },
  bioInput: {
    height: 100,
    paddingTop: spacing[3],
  },
  cityOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cityOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing[3],
  },
  cuisineChip: {
    alignItems: 'center',
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    minWidth: 90,
  },
  cuisineChipSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  dietaryOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[4],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dietaryOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
  },
  unchecked: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.gray300,
  },
  skipBtn: {
    alignItems: 'center',
    paddingVertical: spacing[2],
  },
});
