import React, { createContext, useContext, useMemo } from 'react';
import { Platform } from 'react-native';
import { useAuthStore } from '@/stores/authStore';
import { colors } from './colors';

/**
 * The subset of the palette that a shop theme can recolor app-wide. These are
 * the "brand" colors — the primary/accent family that drives buttons, active
 * states, the tab bar, and highlights across every screen. Structural colors
 * (backgrounds, text, borders) stay constant so contrast/readability are safe;
 * per-screen dark-mode theming can layer on later.
 *
 * "Signature" themes additionally set `displayFontFamily` — a heading/display
 * font applied app-wide (headings & titles only, never body text) for a bigger
 * identity shift than colour alone. We use built-in platform fonts so nothing
 * has to be bundled, and only short heading strings change so layout is safe.
 */
export interface AppTheme {
  primary: string;
  primaryDark: string;
  primarySurface: string;
  accent: string;
  accentDark: string;
  displayFontFamily?: string;
}

// Built-in system fonts — no asset bundling required.
const HEADING_FONTS = {
  serif: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
  playful: Platform.select({ ios: 'Chalkboard SE', android: 'casual', default: 'System' }),
} as const;

const BASE: AppTheme = {
  primary: colors.primary,
  primaryDark: colors.primaryDark,
  primarySurface: colors.primarySurface,
  accent: colors.accent,
  accentDark: colors.accentDark,
};

// Keyed by SHOP_THEMES ids (services/coins.ts).
const THEME_OVERRIDES: Record<string, Partial<AppTheme>> = {
  // ── Colour themes (cheap tier) ──
  default:     {},
  pandan:      { primary: '#16A34A', primaryDark: '#14532D', primarySurface: '#DCFCE7', accent: '#16A34A', accentDark: '#14532D' },
  modern_kl:   { primary: '#3B82F6', primaryDark: '#1D4ED8', primarySurface: '#E4EDFF', accent: '#3B82F6', accentDark: '#1D4ED8' },
  // ── Signature themes (premium tier — recolour + heading font) ──
  kopitiam:    { primary: '#A15A1B', primaryDark: '#5C2D0A', primarySurface: '#F3E4D0', accent: '#E0A54B', accentDark: '#B4801F', displayFontFamily: HEADING_FONTS.serif },
  nyonya:      { primary: '#BE185D', primaryDark: '#831843', primarySurface: '#FCE7F0', accent: '#0D9488', accentDark: '#0F766E', displayFontFamily: HEADING_FONTS.serif },
  pasar_malam: { primary: '#7C3AED', primaryDark: '#4C1D95', primarySurface: '#EDE4FF', accent: '#F59E0B', accentDark: '#B45309', displayFontFamily: HEADING_FONTS.playful },
};

const ThemeContext = createContext<AppTheme>(BASE);

/** App-wide brand palette for the current user's equipped theme. */
export const useTheme = () => useContext(ThemeContext);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const activeTheme = useAuthStore((s) => s.profile?.active_theme);
  const value = useMemo<AppTheme>(
    () => ({ ...BASE, ...(THEME_OVERRIDES[activeTheme ?? 'default'] ?? {}) }),
    [activeTheme],
  );
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
