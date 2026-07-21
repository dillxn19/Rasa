import { colors } from './colors';

/**
 * Visual palette applied to a user's profile when they equip a shop theme.
 * Keyed by the same ids as SHOP_THEMES in services/coins.ts.
 */
export interface ProfileThemePalette {
  id: string;
  /** Header/cover gradient (used when the user has no cover photo). */
  headerGradient: [string, string];
  /** Accent used for the avatar ring + themed highlights. */
  accent: string;
  /** Text/icon color that sits on top of the header gradient. */
  onHeader: string;
}

export const PROFILE_THEMES: Record<string, ProfileThemePalette> = {
  default:    { id: 'default',    headerGradient: [colors.primary, colors.primaryDark], accent: colors.accent,  onHeader: colors.white },
  dark_mamak: { id: 'dark_mamak', headerGradient: ['#1F2937', '#0B1120'],               accent: '#F59E0B',      onHeader: colors.white },
  kopitiam:   { id: 'kopitiam',   headerGradient: ['#A15A1B', '#5C2D0A'],               accent: '#E0A54B',      onHeader: colors.white },
  modern_kl:  { id: 'modern_kl',  headerGradient: ['#3B82F6', '#1D4ED8'],               accent: '#60A5FA',      onHeader: colors.white },
  pandan:     { id: 'pandan',     headerGradient: ['#16A34A', '#14532D'],               accent: '#4F8A5B',      onHeader: colors.white },
  nyonya:     { id: 'nyonya',     headerGradient: ['#BE185D', '#831843'],               accent: '#0D9488',      onHeader: colors.white },
  pasar_malam:{ id: 'pasar_malam',headerGradient: ['#7C3AED', '#4C1D95'],               accent: '#F59E0B',      onHeader: colors.white },
  cny:        { id: 'cny',        headerGradient: ['#E11D48', '#7F1D1D'],               accent: colors.accent,  onHeader: colors.white },
};

export function getProfileTheme(id?: string | null): ProfileThemePalette {
  return (id && PROFILE_THEMES[id]) || PROFILE_THEMES.default;
}
