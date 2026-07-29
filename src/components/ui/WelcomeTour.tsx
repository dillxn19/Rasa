import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Dimensions, Modal } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, radius } from '@/theme';
import { RText, Caption } from '@/components/ui/Text';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_COUNT = 5;
const TAB_W = SCREEN_WIDTH / TAB_COUNT;
const TAB_BAR_H = 64;

// The real bottom tabs, in the real order (Home · Explore · + · Ranks · Profile).
const TABS: { icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
  { icon: 'home', label: 'Home' },
  { icon: 'compass', label: 'Explore' },
  { icon: 'add', label: 'Add' },
  { icon: 'trophy', label: 'Ranks' },
  { icon: 'person', label: 'Profile' },
];

interface Step {
  tab: number; // index into TABS, or -1 for the intro (no tab highlighted)
  emoji: string;
  title: string;
  body: string;
}

const STEPS: Step[] = [
  {
    tab: -1, emoji: '🍜', title: 'Welcome to Rasa',
    body: "Malaysia's food discovery app — rate every place you eat, follow friends and find your next great makan. Here's where everything is 👇",
  },
  {
    tab: 0, emoji: '🏠', title: 'Home',
    body: 'Your feed — see what the people you follow are rating and reviewing. Tap any card to open the place, like, comment or save.',
  },
  {
    tab: 1, emoji: '🧭', title: 'Explore',
    body: 'Browse by category or iconic dish, search anything, sort Near Me / Top Rated and flip the ☪ Halal filter. Your Recommendations & Taste Match live here too.',
  },
  {
    tab: 2, emoji: '➕', title: 'Rate a place',
    body: 'The + button is where you rate & review — add a score, photos and a note. Every rating builds your personal rankings.',
  },
  {
    tab: 3, emoji: '🏆', title: 'Ranks',
    body: 'Climb your campus and city leaderboards as you rate more places — a friendly race with friends.',
  },
  {
    tab: 4, emoji: '👤', title: 'Profile',
    body: 'Your Activity, Saved and Lists, your Food Passport, monthly Rasa Wrapped — and the coin Store (tap your coin balance).',
  },
];

export function WelcomeTour({ visible, onDone }: { visible: boolean; onDone: () => void }) {
  const insets = useSafeAreaInsets();
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;
  const barHeight = TAB_BAR_H + insets.bottom;

  const next = () => (isLast ? onDone() : setIndex(i => i + 1));

  // Horizontal centre of the highlighted tab (for the pointer caret).
  const caretLeft = step.tab >= 0 ? TAB_W * (step.tab + 0.5) - 9 : 0;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone} statusBarTranslucent>
      <View style={styles.overlay}>
        {/* Skip */}
        <TouchableOpacity style={[styles.skip, { top: insets.top + spacing[2] }]} onPress={onDone} hitSlop={10}>
          <RText variant="labelMedium" color={colors.whiteTransparent80}>Skip</RText>
        </TouchableOpacity>

        {/* Centred explainer card */}
        <View style={styles.center}>
          <RText style={styles.emoji}>{step.emoji}</RText>
          <RText style={styles.title}>{step.title}</RText>
          <Caption color={colors.whiteTransparent90} align="center" style={styles.body}>{step.body}</Caption>

          <View style={styles.dots}>
            {STEPS.map((_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>

          <TouchableOpacity style={styles.nextBtn} onPress={next} activeOpacity={0.9}>
            <RText variant="buttonMedium" color={colors.textPrimary}>
              {isLast ? "Let's eat 🍜" : 'Next'}
            </RText>
          </TouchableOpacity>
        </View>

        {/* Downward pointer to the highlighted tab */}
        {step.tab >= 0 && (
          <View style={[styles.caret, { bottom: barHeight + 4, left: caretLeft }]} />
        )}

        {/* Replica of the real bottom tab bar so users learn where each lives */}
        <View style={[styles.tabBar, { height: barHeight, paddingBottom: insets.bottom }]}>
          {TABS.map((t, i) => {
            const active = step.tab === i;
            const isAdd = t.icon === 'add';
            return (
              <View key={t.label} style={styles.tabItem}>
                <View
                  style={[
                    styles.tabIcon,
                    isAdd && styles.addIcon,
                    active && (isAdd ? styles.addIconActive : styles.tabIconActive),
                  ]}
                >
                  <Ionicons
                    name={t.icon}
                    size={isAdd ? 24 : 22}
                    color={isAdd ? colors.white : active ? colors.white : 'rgba(255,255,255,0.5)'}
                  />
                </View>
                {!isAdd && (
                  <RText style={[styles.tabLabel, active && { color: colors.white, fontWeight: '800' }]}>
                    {t.label}
                  </RText>
                )}
              </View>
            );
          })}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(12,9,7,0.9)' },
  skip: { position: 'absolute', right: spacing[5], zIndex: 2, padding: spacing[2] },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing[8],
  },
  emoji: { fontSize: 60, lineHeight: 72, marginBottom: spacing[4], textAlign: 'center' },
  title: {
    color: colors.white, fontSize: 28, lineHeight: 34, fontWeight: '900',
    letterSpacing: -0.5, textAlign: 'center', marginBottom: spacing[3],
  },
  body: { fontSize: 15, lineHeight: 22, maxWidth: 320 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: spacing[2], marginTop: spacing[6] },
  dot: { width: 7, height: 7, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.35)' },
  dotActive: { backgroundColor: colors.white, width: 22 },
  nextBtn: {
    marginTop: spacing[6],
    backgroundColor: colors.white,
    borderRadius: radius.full,
    paddingVertical: spacing[4],
    paddingHorizontal: spacing[10],
    alignItems: 'center',
  },
  caret: {
    position: 'absolute',
    width: 0, height: 0,
    borderLeftWidth: 9, borderRightWidth: 9, borderTopWidth: 10,
    borderLeftColor: 'transparent', borderRightColor: 'transparent',
    borderTopColor: colors.primary,
  },
  tabBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.15)',
    paddingTop: spacing[2],
  },
  tabItem: { width: TAB_W, alignItems: 'center', gap: 2 },
  tabIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  tabIconActive: { backgroundColor: colors.primary },
  addIcon: { backgroundColor: 'rgba(217,72,65,0.6)', width: 44, height: 44, borderRadius: 22 },
  addIconActive: { backgroundColor: colors.primary },
  tabLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
});
