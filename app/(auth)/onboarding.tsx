import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Dimensions,
  TextInput,
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
import { toast } from '@/stores/toastStore';
import { Button } from '@/components/ui/Button';
import { RText, H2, Body, Caption } from '@/components/ui/Text';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/lib/supabase';
import { getPendingReferrer, clearPendingReferrer, setPendingReferrer } from '@/lib/referral';
import { recordReferral, activateReferral } from '@/services/referrals';
import { getSignupGate, validateReferralCode } from '@/services/signup';
import { track } from '@/lib/analytics';
import { getOnboardingSeedRestaurants, submitReview } from '@/services/restaurants';
import { StarRating } from '@/components/ui/StarRating';
import { Avatar } from '@/components/ui/Avatar';
import {
  CuisineType, DietaryOption, CUISINE_LABELS, DIETARY_LABELS, CATEGORY_LABELS, MALAYSIA_CITIES,
  type Restaurant,
} from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOTAL_STEPS = 5;
const MIN_SEED_RATINGS = 3;

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

  // Taste-seed step: restaurants the user rates to bootstrap their taste graph.
  const [seedRestaurants, setSeedRestaurants] = useState<Restaurant[]>([]);
  const [seedLoading, setSeedLoading] = useState(false);
  const [seedRatings, setSeedRatings] = useState<Record<string, number>>({});
  const seedCount = Object.keys(seedRatings).length;

  // Invite-only catch-all: covers Google/OAuth new users (who never hit the
  // register screen). null = still checking; true = must enter a code to proceed.
  const [needsGate, setNeedsGate] = useState<boolean | null>(null);
  useEffect(() => {
    (async () => {
      const gateOn = await getSignupGate().catch(() => true);
      if (!gateOn) { setNeedsGate(false); return; }
      const pending = await getPendingReferrer().catch(() => null);
      const ok = pending ? await validateReferralCode(pending).catch(() => false) : false;
      setNeedsGate(!ok);
    })();
  }, []);

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

  const rateSeed = (restaurantId: string, rating: number) => {
    setSeedRatings(prev => ({ ...prev, [restaurantId]: rating }));
  };

  // Lazily load seed restaurants the first time the user reaches the taste step.
  useEffect(() => {
    if (step === TOTAL_STEPS - 1 && seedRestaurants.length === 0 && !seedLoading) {
      setSeedLoading(true);
      getOnboardingSeedRestaurants(city, 12)
        .then(setSeedRestaurants)
        .catch(() => setSeedRestaurants([]))
        .finally(() => setSeedLoading(false));
    }
  }, [step, city, seedRestaurants.length, seedLoading]);

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

      // Seed the taste graph with the onboarding ratings (plain reviews — no
      // coins, so onboarding can't be farmed). Non-blocking on failure.
      const seedEntries = Object.entries(seedRatings);
      if (seedEntries.length > 0) {
        await Promise.all(
          seedEntries.map(([restaurantId, rating]) =>
            submitReview({
              user_id: profile.id,
              restaurant_id: restaurantId,
              rating,
              is_public: true,
            }).catch(() => {})
          )
        );
      }

      await refreshProfile();

      // If this user arrived via someone's invite link, record the referral now
      // that their profile (username) exists. Fire-and-forget — never block entry.
      try {
        const ref = await getPendingReferrer();
        if (ref && ref !== username.toLowerCase().trim()) {
          await recordReferral(ref, profile.id);
          // Rating spots during onboarding is genuine engagement → activate now.
          if (seedEntries.length > 0) await activateReferral(profile.id);
        }
        await clearPendingReferrer();
      } catch { /* non-fatal */ }

      track('onboarding_completed');
      router.replace('/(tabs)');
    } catch (error) {
      toast.error('Failed to save profile. Please try again.');
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
    <StepTaste
      restaurants={seedRestaurants}
      ratings={seedRatings}
      onRate={rateSeed}
      loading={seedLoading}
      city={city}
    />,
  ];

  const stepTitles = [
    'Create your profile',
    'Where are you based?',
    'What cuisines do you love?',
    'Any dietary preferences?',
    'Rate a few places',
  ];

  const stepSubtitles = [
    'Tell the community about yourself',
    'We\'ll find restaurants near you',
    'Pick all that apply — we\'ll personalise your feed',
    'Skip if none apply',
    `Rate at least ${MIN_SEED_RATINGS} spots you've tried — this powers your taste matches & recommendations`,
  ];

  // Taste step can proceed once the user rates the minimum — or immediately if
  // there are no seed restaurants to rate (empty DB), so nobody gets trapped.
  const canProceed = [
    displayName.length >= 2 && username.length >= 3,
    city.length > 0,
    selectedCuisines.length > 0,
    true,
    seedCount >= MIN_SEED_RATINGS || (!seedLoading && seedRestaurants.length === 0),
  ];

  // Invite-only gate — block onboarding until a valid code is entered.
  if (needsGate === null) {
    return <View style={[styles.container, styles.gateCenter]} />;
  }
  if (needsGate) {
    return <ReferralGate onPass={async (code) => { await setPendingReferrer(code); setNeedsGate(false); }} />;
  }

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
            label={
              seedCount >= MIN_SEED_RATINGS || seedRestaurants.length === 0
                ? 'Start exploring'
                : `Rate ${MIN_SEED_RATINGS - seedCount} more to continue`
            }
            onPress={handleComplete}
            fullWidth
            size="lg"
            isLoading={isLoading}
            isDisabled={!canProceed[step]}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

// Invite-only gate shown before onboarding when a valid referral code is missing.
function ReferralGate({ onPass }: { onPass: (code: string) => void | Promise<void> }) {
  const [code, setCode] = useState('');
  const [checking, setChecking] = useState(false);

  const submit = async () => {
    const c = code.trim();
    if (!c) { toast.error('Enter your invite code to continue.'); return; }
    setChecking(true);
    const valid = await validateReferralCode(c).catch(() => false);
    setChecking(false);
    if (!valid) { toast.error("That code isn't valid. Check it and try again.", 'Invalid code'); return; }
    await onPass(c.toUpperCase());
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.gateWrap}>
        <View style={styles.gateBadge}><RText style={{ fontSize: 32, lineHeight: 40 }}>🎟️</RText></View>
        <H2 style={{ marginTop: spacing[5], textAlign: 'center' }}>You're almost in</H2>
        <Body color={colors.textSecondary} style={{ textAlign: 'center', marginTop: spacing[2], maxWidth: 300 }}>
          Rasa is invite-only right now. Enter a friend's referral code to join.
        </Body>
        <TextInput
          style={styles.gateInput}
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          placeholder="e.g. MK7Q27"
          placeholderTextColor={colors.textTertiary}
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={10}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        <View style={{ width: '100%', marginTop: spacing[4] }}>
          <Button label="Continue" onPress={submit} fullWidth size="lg" isLoading={checking} />
        </View>
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

function StepTaste({
  restaurants, ratings, onRate, loading, city,
}: {
  restaurants: Restaurant[];
  ratings: Record<string, number>;
  onRate: (id: string, rating: number) => void;
  loading: boolean;
  city: string;
}) {
  const rated = Object.keys(ratings).length;

  if (loading) {
    return (
      <View style={[styles.stepContent, { alignItems: 'center', paddingTop: spacing[16] }]}>
        <RText style={{ fontSize: 40, lineHeight: 50 }}>🍜</RText>
        <Caption color={colors.textSecondary} style={{ marginTop: spacing[3] }}>
          Finding popular spots{city ? ` in ${city}` : ''}…
        </Caption>
      </View>
    );
  }

  if (restaurants.length === 0) {
    return (
      <View style={[styles.stepContent, { alignItems: 'center', paddingTop: spacing[12] }]}>
        <RText style={{ fontSize: 40, lineHeight: 50 }}>🌱</RText>
        <RText variant="titleMedium" style={{ marginTop: spacing[3] }}>Nothing to rate yet</RText>
        <Caption color={colors.textSecondary} align="center" style={{ marginTop: spacing[2], maxWidth: 280 }}>
          No restaurants here yet — you can start rating as you explore. Tap below to continue.
        </Caption>
      </View>
    );
  }

  return (
    <View style={styles.stepContent}>
      {/* Progress pill */}
      <View style={styles.seedProgress}>
        <RText variant="labelMedium" color={rated >= MIN_SEED_RATINGS ? colors.success : colors.primary}>
          {rated >= MIN_SEED_RATINGS
            ? `✓ ${rated} rated — you're all set`
            : `${rated}/${MIN_SEED_RATINGS} rated`}
        </RText>
      </View>

      {restaurants.map(r => {
        const value = ratings[r.id] ?? 0;
        return (
          <View key={r.id} style={[styles.seedRow, value > 0 && styles.seedRowRated]}>
            <Avatar uri={r.cover_photo_url} name={r.name} size="md" />
            <View style={{ flex: 1, marginLeft: spacing[3] }}>
              <RText variant="titleSmall" numberOfLines={1}>{r.name}</RText>
              <Caption color={colors.textTertiary} numberOfLines={1}>
                {CATEGORY_LABELS[r.category] ?? r.category}
                {r.area ? ` · ${r.area}` : r.city ? ` · ${r.city}` : ''}
              </Caption>
              <View style={{ marginTop: spacing[1] }}>
                <StarRating value={value} onChange={(v) => onRate(r.id, v)} size={24} />
              </View>
            </View>
          </View>
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
  gateCenter: { alignItems: 'center', justifyContent: 'center' },
  gateWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[6],
  },
  gateBadge: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: colors.primarySurface,
    alignItems: 'center', justifyContent: 'center',
  },
  gateInput: {
    width: '100%',
    marginTop: spacing[6],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[4],
    fontSize: 18,
    letterSpacing: 2,
    textAlign: 'center',
    color: colors.textPrimary,
    backgroundColor: colors.gray50,
  },
  seedProgress: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primarySurface,
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1],
    borderRadius: radius.full,
    marginBottom: spacing[2],
  },
  seedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing[3],
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  seedRowRated: {
    borderColor: colors.primary,
    backgroundColor: colors.primarySurface,
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
