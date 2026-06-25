import { Platform, StyleSheet } from 'react-native';
import { colors } from './colors';
import { typography, fontSize, fontWeight } from './typography';

export { colors, typography, fontSize, fontWeight };
export type { ColorKey, Color } from './colors';
export type { TypographyVariant } from './typography';

// ─── Spacing ────────────────────────────────────────────────
export const spacing = {
  px: 1,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  11: 44,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,
  28: 112,
  32: 128,
} as const;

// ─── Border radius ──────────────────────────────────────────
export const radius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  full: 9999,
} as const;

// ─── Shadows ─────────────────────────────────────────────────
export const shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  xs: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 2,
    },
    android: { elevation: 1 },
    default: {},
  }),
  sm: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
    },
    android: { elevation: 2 },
    default: {},
  }),
  md: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 4 },
    default: {},
  }),
  lg: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.10,
      shadowRadius: 16,
    },
    android: { elevation: 8 },
    default: {},
  }),
  xl: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 16 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
    },
    android: { elevation: 12 },
    default: {},
  }),
  card: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.08,
      shadowRadius: 8,
    },
    android: { elevation: 3 },
    default: {},
  }),
  modal: Platform.select({
    ios: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: -4 },
      shadowOpacity: 0.1,
      shadowRadius: 20,
    },
    android: { elevation: 16 },
    default: {},
  }),
} as const;

// ─── Layout ──────────────────────────────────────────────────
export const layout = {
  screenPaddingHorizontal: spacing[4],
  screenPaddingVertical: spacing[4],
  cardBorderRadius: radius.xl,
  tabBarHeight: 64,
  headerHeight: 56,
  bottomSheetRadius: radius['3xl'],
  maxWidth: 390,
} as const;

// ─── Animation ───────────────────────────────────────────────
export const animation = {
  fast: 150,
  normal: 250,
  slow: 350,
  spring: { damping: 15, stiffness: 200 },
  springBouncy: { damping: 10, stiffness: 300 },
  springSmooth: { damping: 20, stiffness: 150 },
} as const;

// ─── Global StyleSheet ───────────────────────────────────────
export const globalStyles = StyleSheet.create({
  flex1: { flex: 1 },
  flexRow: { flexDirection: 'row' },
  flexRowCenter: { flexDirection: 'row', alignItems: 'center' },
  flexRowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  center: { alignItems: 'center', justifyContent: 'center' },
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    paddingHorizontal: layout.screenPaddingHorizontal,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: layout.cardBorderRadius,
    ...(shadows.card as object),
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing[3],
  },
  absoluteFill: StyleSheet.absoluteFillObject,
});

// ─── Gradient presets ────────────────────────────────────────
export const gradients = {
  primary: [colors.primary, colors.primaryDark] as string[],
  primarySoft: [colors.primaryLight, colors.primary] as string[],
  imageOverlay: ['transparent', 'rgba(0,0,0,0.7)'] as string[],
  imageOverlayTop: ['rgba(0,0,0,0.4)', 'transparent'] as string[],
  accent: [colors.accent, '#E8852A'] as string[],
  dark: ['#1C1C1E', '#000000'] as string[],
  warmWhite: ['#FFFFFF', '#FFF8F6'] as string[],
} as const;

// ─── Z-index ──────────────────────────────────────────────────
export const zIndex = {
  base: 0,
  raised: 10,
  dropdown: 100,
  sticky: 200,
  overlay: 300,
  modal: 400,
  toast: 500,
} as const;
