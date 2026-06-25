import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from './Text';
import { getCurrentMealTime, MEAL_TIME_LABELS, type MealTimeKey } from '@/types';

const MEAL_CONFIG: Record<MealTimeKey, {
  emoji: string;
  heading: string;
  subtext: string;
  gradient: [string, string];
  suggestions: string[];
}> = {
  breakfast: {
    emoji: '☀️',
    heading: 'Good morning!',
    subtext: 'Best breakfast spots open now',
    gradient: ['#F4B942', '#E07B39'],
    suggestions: ['Kopitiam', 'Dim Sum', 'Nasi Lemak'],
  },
  brunch: {
    emoji: '🍳',
    heading: 'Time to brunch',
    subtext: 'Weekend-worthy brunch spots',
    gradient: ['#EC4899', '#D94841'],
    suggestions: ['Cafes', 'Avocado Toast', 'Eggs Benedict'],
  },
  lunch: {
    emoji: '🍱',
    heading: 'Lunch time',
    subtext: 'Best places near you right now',
    gradient: ['#D94841', '#B53535'],
    suggestions: ['Chicken Rice', 'Pan Mee', 'Mixed Rice'],
  },
  tea: {
    emoji: '☕',
    heading: 'Afternoon tea',
    subtext: 'Coffee shops and tea houses',
    gradient: ['#8B6914', '#F4B942'],
    suggestions: ['Teh Tarik', 'Kaya Toast', 'Kuih'],
  },
  dinner: {
    emoji: '🌆',
    heading: 'Dinner time',
    subtext: 'Where are you eating tonight?',
    gradient: ['#6D28D9', '#4F8A5B'],
    suggestions: ['Seafood', 'Hotpot', 'Restaurants'],
  },
  supper: {
    emoji: '🌙',
    heading: 'Supper time',
    subtext: 'Open late and good',
    gradient: ['#1F2937', '#374151'],
    suggestions: ['Mamak', 'Satay', 'Lok Lok'],
  },
};

interface TimeAwareBannerProps {
  onPress?: (mealTime: MealTimeKey) => void;
}

export function TimeAwareBanner({ onPress }: TimeAwareBannerProps) {
  const mealTime = getCurrentMealTime();
  const config = MEAL_CONFIG[mealTime];

  const handlePress = () => {
    if (onPress) onPress(mealTime);
    else router.push(`/(tabs)/explore?meal=${mealTime}`);
  };

  return (
    <TouchableOpacity onPress={handlePress} activeOpacity={0.9} style={styles.container}>
      <LinearGradient colors={config.gradient} style={styles.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
        <View style={styles.content}>
          <View>
            <View style={styles.topRow}>
              <RText style={styles.emoji}>{config.emoji}</RText>
              <RText variant="h4" color={colors.white} style={{ marginLeft: spacing[2] }}>
                {config.heading}
              </RText>
            </View>
            <Caption color="rgba(255,255,255,0.8)" style={{ marginTop: 2 }}>
              {config.subtext}
            </Caption>
            <View style={styles.suggestionRow}>
              {config.suggestions.map(s => (
                <View key={s} style={styles.suggestionPill}>
                  <RText style={{ fontSize: 11, color: colors.white, fontWeight: '600' }}>{s}</RText>
                </View>
              ))}
            </View>
          </View>
          <Ionicons name="arrow-forward-circle" size={28} color="rgba(255,255,255,0.8)" />
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
}

// ─── Compact version for feed section headers ─────────────────

export function MealTimeBadge({ mealTime }: { mealTime: MealTimeKey }) {
  const config = MEAL_CONFIG[mealTime];
  return (
    <View style={styles.badge}>
      <LinearGradient colors={config.gradient} style={styles.badgeGradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <RText style={{ fontSize: 12 }}>{config.emoji}</RText>
        <RText variant="caption" color={colors.white} style={{ marginLeft: 4, fontWeight: '700' }}>
          {MEAL_TIME_LABELS[mealTime]}
        </RText>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: spacing[4],
    borderRadius: radius.xl,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: radius.xl,
    padding: spacing[5],
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing[1],
  },
  emoji: {
    fontSize: 20,
  },
  suggestionRow: {
    flexDirection: 'row',
    gap: spacing[2],
    marginTop: spacing[3],
    flexWrap: 'wrap',
  },
  suggestionPill: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: spacing[3],
    paddingVertical: 4,
    borderRadius: radius.full,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  badge: {
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  badgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing[3],
    paddingVertical: spacing[1.5],
    borderRadius: radius.full,
  },
});
