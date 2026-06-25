export const colors = {
  // ─── Brand ──────────────────────────────────────────────
  // Deep Chili Red — sambal, spice, passion, Malaysian cuisine
  primary: '#D94841',
  primaryLight: '#E85E57',
  primaryDark: '#B53535',
  primarySurface: '#FEF0EE',

  // Deep charcoal for secondary actions
  secondary: '#1F2937',
  secondaryLight: '#374151',

  // Turmeric Gold — achievements, badges, premium
  accent: '#F4B942',
  accentLight: '#F9CF77',
  accentDark: '#D9972A',
  accentSurface: '#FEF9EC',

  // ─── Semantics ───────────────────────────────────────────
  // Pandan Green — halal, success, saved
  success: '#4F8A5B',
  successLight: '#E4F2E7',
  successDark: '#376040',

  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // ─── Halal indicator (Pandan Green) ──────────────────────
  halal: '#4F8A5B',
  halalBg: '#E4F2E7',

  // ─── Neutrals (warm toned, not cool gray) ────────────────
  white: '#FFFFFF',
  black: '#000000',

  gray50: '#FAF9F7',
  gray100: '#F5F3EF',
  gray200: '#EAE7E1',
  gray300: '#D6D2C9',
  gray400: '#B5B0A5',
  gray500: '#8D8880',
  gray600: '#6B6660',
  gray700: '#504C47',
  gray800: '#37342F',
  gray900: '#1F1D1A',

  // ─── Text ────────────────────────────────────────────────
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textDisabled: '#D1D5DB',
  textInverse: '#FFFFFF',
  textLink: '#D94841',

  // ─── Background — Coconut Cream, not pure white ──────────
  background: '#FFF8F0',
  backgroundSecondary: '#FFF0E6',
  surface: '#FFFFFF',
  surfaceWarm: '#FFFBF7',
  surfaceRaised: '#FFFFFF',
  overlay: 'rgba(31, 41, 55, 0.5)',
  overlayLight: 'rgba(31, 41, 55, 0.3)',

  // ─── Border (warm toned) ─────────────────────────────────
  border: '#EAE7E1',
  borderLight: '#F5F3EF',
  borderFocus: '#D94841',

  // ─── Star rating ─────────────────────────────────────────
  starFilled: '#F4B942',
  starEmpty: '#EAE7E1',

  // ─── Malaysian food category palette ─────────────────────
  categoryHawker: '#D94841',     // chili red — hawker energy
  categoryMamak: '#E07B39',      // curry orange — mamak warmth
  categoryCafe: '#7C6BAE',       // purple — cafe cool
  categoryKopitiam: '#8B6914',   // kopi brown — old school
  categoryFineDining: '#1F2937', // deep navy — elegance
  categoryFoodCourt: '#2563EB',  // blue — organized, clean
  categoryNightMarket: '#6D28D9', // purple-dark — night, mystery
  categoryRooftop: '#0EA5E9',    // sky — elevated
  categoryBar: '#374151',

  // ─── Taste match ─────────────────────────────────────────
  matchHigh: '#4F8A5B',    // pandan green 80%+
  matchMedium: '#F59E0B',  // warm amber 50-79%
  matchLow: '#8D8880',     // muted <50%

  // ─── Social ──────────────────────────────────────────────
  liked: '#D94841',
  likedBg: '#FEF0EE',
  bookmarked: '#F4B942',
  bookmarkedBg: '#FEF9EC',

  // ─── Food tags ───────────────────────────────────────────
  tagMustTry: '#D94841',
  tagHiddenGem: '#7C6BAE',
  tagWorthQueue: '#E07B39',
  tagGreatValue: '#4F8A5B',
  tagLateNight: '#6D28D9',
  tagDateSpot: '#EC4899',
  tagOverrated: '#8D8880',

  // ─── Meal times ──────────────────────────────────────────
  mealBreakfast: '#F59E0B',   // golden morning
  mealBrunch: '#EC4899',      // pink brunch
  mealLunch: '#D94841',       // energetic red
  mealDinner: '#6D28D9',      // deep evening purple
  mealSupper: '#1F2937',      // midnight navy

  // ─── Transparent ─────────────────────────────────────────
  transparent: 'transparent',
  blackTransparent10: 'rgba(0,0,0,0.1)',
  blackTransparent20: 'rgba(0,0,0,0.2)',
  blackTransparent40: 'rgba(0,0,0,0.4)',
  blackTransparent60: 'rgba(0,0,0,0.6)',
  whiteTransparent80: 'rgba(255,255,255,0.8)',
  whiteTransparent90: 'rgba(255,255,255,0.9)',

  // ─── Price ───────────────────────────────────────────────
  price1: '#4F8A5B',
  price2: '#F4B942',
  price3: '#E07B39',
  price4: '#D94841',
} as const;

export type ColorKey = keyof typeof colors;
export type Color = (typeof colors)[ColorKey];

// Dark mode palette
export const darkColors = {
  ...colors,
  background: '#111008',
  backgroundSecondary: '#1A1710',
  surface: '#1F1D1A',
  surfaceWarm: '#252219',
  surfaceRaised: '#2A271F',
  textPrimary: '#F5F3EF',
  textSecondary: '#B5B0A5',
  textTertiary: '#6B6660',
  border: '#37342F',
  borderLight: '#2A271F',
} as const;
