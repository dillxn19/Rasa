import { Platform } from 'react-native';

const fontFamily = Platform.select({
  ios: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
  android: {
    regular: 'Roboto',
    medium: 'Roboto-Medium',
    semibold: 'Roboto-Medium',
    bold: 'Roboto-Bold',
  },
  default: {
    regular: 'System',
    medium: 'System',
    semibold: 'System',
    bold: 'System',
  },
});

export const fontWeight = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
  extrabold: '800' as const,
  black: '900' as const,
};

export const fontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 34,
  '5xl': 40,
  '6xl': 48,
};

export const lineHeight = {
  tight: 1.2,
  snug: 1.35,
  normal: 1.5,
  relaxed: 1.625,
  loose: 2,
};

export const letterSpacing = {
  tighter: -0.8,
  tight: -0.4,
  normal: 0,
  wide: 0.4,
  wider: 0.8,
  widest: 1.6,
};

export const typography = {
  // Display
  displayLarge: {
    fontFamily: fontFamily?.bold,
    fontWeight: fontWeight.bold,
    fontSize: fontSize['5xl'],
    lineHeight: fontSize['5xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tighter,
  },
  displayMedium: {
    fontFamily: fontFamily?.bold,
    fontWeight: fontWeight.bold,
    fontSize: fontSize['4xl'],
    lineHeight: fontSize['4xl'] * lineHeight.tight,
    letterSpacing: letterSpacing.tighter,
  },

  // Heading
  h1: {
    fontFamily: fontFamily?.bold,
    fontWeight: fontWeight.bold,
    fontSize: fontSize['3xl'],
    lineHeight: fontSize['3xl'] * lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },
  h2: {
    fontFamily: fontFamily?.bold,
    fontWeight: fontWeight.bold,
    fontSize: fontSize['2xl'],
    lineHeight: fontSize['2xl'] * lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },
  h3: {
    fontFamily: fontFamily?.semibold,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * lineHeight.snug,
  },
  h4: {
    fontFamily: fontFamily?.semibold,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.lg,
    lineHeight: fontSize.lg * lineHeight.normal,
  },

  // Title (for cards, list items)
  titleLarge: {
    fontFamily: fontFamily?.semibold,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.snug,
    letterSpacing: letterSpacing.tight,
  },
  titleMedium: {
    fontFamily: fontFamily?.medium,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.snug,
  },
  titleSmall: {
    fontFamily: fontFamily?.medium,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.snug,
  },

  // Body
  bodyLarge: {
    fontFamily: fontFamily?.regular,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.normal,
  },
  bodyMedium: {
    fontFamily: fontFamily?.regular,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.normal,
  },
  bodySmall: {
    fontFamily: fontFamily?.regular,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
  },

  // Label
  labelLarge: {
    fontFamily: fontFamily?.medium,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  labelMedium: {
    fontFamily: fontFamily?.medium,
    fontWeight: fontWeight.medium,
    fontSize: 12,
    lineHeight: 12 * lineHeight.normal,
    letterSpacing: letterSpacing.wide,
  },
  labelSmall: {
    fontFamily: fontFamily?.medium,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.normal,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },

  // Caption
  caption: {
    fontFamily: fontFamily?.regular,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.xs,
    lineHeight: fontSize.xs * lineHeight.normal,
  },

  // Button
  buttonLarge: {
    fontFamily: fontFamily?.semibold,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.md,
    lineHeight: fontSize.md * lineHeight.tight,
    letterSpacing: letterSpacing.tight,
  },
  buttonMedium: {
    fontFamily: fontFamily?.semibold,
    fontWeight: fontWeight.semibold,
    fontSize: fontSize.base,
    lineHeight: fontSize.base * lineHeight.tight,
  },
  buttonSmall: {
    fontFamily: fontFamily?.medium,
    fontWeight: fontWeight.medium,
    fontSize: fontSize.sm,
    lineHeight: fontSize.sm * lineHeight.tight,
  },

  // Special
  rating: {
    fontFamily: fontFamily?.bold,
    fontWeight: fontWeight.bold,
    fontSize: fontSize['2xl'],
    letterSpacing: letterSpacing.tight,
  },
  stat: {
    fontFamily: fontFamily?.bold,
    fontWeight: fontWeight.bold,
    fontSize: fontSize.xl,
    lineHeight: fontSize.xl * lineHeight.tight,
  },
  statLabel: {
    fontFamily: fontFamily?.regular,
    fontWeight: fontWeight.regular,
    fontSize: fontSize.xs,
    letterSpacing: letterSpacing.wider,
    textTransform: 'uppercase' as const,
  },
  matchScore: {
    fontFamily: fontFamily?.extrabold ?? fontFamily?.bold,
    fontWeight: fontWeight.extrabold,
    fontSize: fontSize['3xl'],
    letterSpacing: letterSpacing.tight,
  },
};

export type TypographyVariant = keyof typeof typography;
