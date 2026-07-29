import { supabase } from '@/lib/supabase';

export type CoinTransactionType =
  | 'review'
  | 'first_restaurant_review'
  | 'streak_week'
  | 'streak_milestone'
  | 'badge'
  | 'referral_signup'
  | 'referral_activated'
  | 'like_received'
  | 'spend_theme'
  | 'spend_sticker'
  | 'streak_repair';

export const COIN_AMOUNTS = {
  review: 25,
  first_restaurant_review: 20,   // bonus on top of review (+45 total)
  streak_week: 20,               // per week maintained
  streak_milestone_5: 100,       // every 5-week milestone
  badge: 50,
  referral_signup: 200,
  referral_activated: 200,
  like_received: 1,              // +1 per like, capped at +5 lifetime per review
} as const;

export interface CoinTransaction {
  id: string;
  amount: number;
  type: CoinTransactionType;
  description: string | null;
  created_at: string;
}

export async function awardCoins(
  userId: string,
  amount: number,
  type: CoinTransactionType,
  description: string,
): Promise<number> {
  const { data, error } = await supabase.rpc('award_coins', {
    p_user_id: userId,
    p_amount: amount,
    p_type: type,
    p_description: description,
  });
  if (error) throw error;
  return data as number;
}

export async function getUserCoins(userId: string): Promise<number> {
  const { data } = await supabase
    .from('food_passports')
    .select('coins')
    .eq('user_id', userId)
    .single();
  return (data?.coins as number) ?? 0;
}

/** Anti-inflation guardrail: max coins a user can EARN from activity per day. */
export const DAILY_EARN_CAP = 300;

/** Sum of positive coin transactions for the user since local midnight. */
export async function getCoinsEarnedToday(userId: string): Promise<number> {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const { data } = await supabase
    .from('coin_transactions')
    .select('amount')
    .eq('user_id', userId)
    .gt('amount', 0)
    .gte('created_at', start.toISOString());
  return (data ?? []).reduce((sum: number, r: any) => sum + (r.amount ?? 0), 0);
}

export async function getCoinHistory(userId: string, limit = 20): Promise<CoinTransaction[]> {
  const { data } = await supabase
    .from('coin_transactions')
    .select('id, amount, type, description, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  return (data ?? []) as CoinTransaction[];
}

export async function spendCoins(
  userId: string,
  amount: number,
  type: CoinTransactionType,
  description: string,
): Promise<{ success: boolean; newBalance: number }> {
  const currentCoins = await getUserCoins(userId);
  if (currentCoins < amount) return { success: false, newBalance: currentCoins };

  const newBalance = await awardCoins(userId, -amount, type, description);
  return { success: true, newBalance };
}

// ─── Theme definitions ────────────────────────────────────────

export interface ThemeDef {
  id: string;
  name: string;
  emoji: string;
  cost: number;
  /**
   * 'color'     — recolours the app accent only (cheap tier).
   * 'signature' — recolours AND swaps the heading font for a distinct voice
   *               (premium tier). See ThemeProvider `displayFontFamily`.
   */
  tier: 'color' | 'signature';
  /** Short note shown on signature cards, e.g. "Serif headings". */
  fontNote?: string;
  /**
   * When true the theme is previewed in the shop but cannot be equipped yet
   * (locked "Coming soon" state). Used to park the signature/font themes until
   * they justify a premium — the accent-only change isn't distinct enough yet.
   */
  comingSoon?: boolean;
  preview: {
    bg: string;
    surface: string;
    primary: string;
    text: string;
  };
}

// NOTE: costs are 0 while testing (paywall disabled) so all themes — including
// the signature font ones — can be previewed immediately. Recommended launch
// pricing: colour tier ~150 🪙, signature tier ~600 🪙 (see economy_and_integrity.md).
// All themes keep light backgrounds so they apply cleanly app-wide (buttons, tab
// bar, profile, headings) via ThemeProvider without a per-screen dark-mode pass.
export const SHOP_THEMES: ThemeDef[] = [
  {
    id: 'default',
    name: 'Classic Rasa',
    emoji: '🍽️',
    cost: 0,
    tier: 'color',
    preview: { bg: '#FFF8F0', surface: '#FFFFFF', primary: '#D94841', text: '#1A1A1A' },
  },
  {
    id: 'pandan',
    name: 'Pandan',
    emoji: '🌿',
    cost: 150,
    tier: 'color',
    preview: { bg: '#F0FDF4', surface: '#FFFFFF', primary: '#16A34A', text: '#14532D' },
  },
  {
    id: 'modern_kl',
    name: 'Modern KL',
    emoji: '🏙️',
    cost: 150,
    tier: 'color',
    preview: { bg: '#F0F4FF', surface: '#FFFFFF', primary: '#3B82F6', text: '#0F172A' },
  },
  {
    id: 'kopitiam',
    name: 'Kopitiam',
    emoji: '☕',
    cost: 0,
    tier: 'signature',
    fontNote: 'Serif headings',
    comingSoon: true,
    preview: { bg: '#FDF6E3', surface: '#FFFBF0', primary: '#B4801F', text: '#3B2105' },
  },
  {
    id: 'nyonya',
    name: 'Nyonya',
    emoji: '🌺',
    cost: 0,
    tier: 'signature',
    fontNote: 'Elegant serif',
    comingSoon: true,
    preview: { bg: '#FFF1F6', surface: '#FFFFFF', primary: '#BE185D', text: '#831843' },
  },
  {
    id: 'pasar_malam',
    name: 'Pasar Malam',
    emoji: '🌙',
    cost: 0,
    tier: 'signature',
    fontNote: 'Playful display',
    comingSoon: true,
    preview: { bg: '#F5F0FF', surface: '#FFFFFF', primary: '#7C3AED', text: '#3B0764' },
  },
];

export async function setActiveTheme(userId: string, themeId: string): Promise<void> {
  const { error } = await supabase
    .from('users')
    .update({ active_theme: themeId })
    .eq('id', userId);
  if (error) throw error;
}

export async function purchaseTheme(
  userId: string,
  theme: ThemeDef,
): Promise<{ success: boolean; message: string; newBalance: number }> {
  if (theme.comingSoon) {
    return { success: false, message: 'This theme is coming soon.', newBalance: 0 };
  }
  if (theme.cost === 0) {
    await setActiveTheme(userId, theme.id);
    return { success: true, message: 'Theme applied!', newBalance: 0 };
  }

  const result = await spendCoins(userId, theme.cost, 'spend_theme', `Purchased theme: ${theme.name}`);
  if (!result.success) {
    return { success: false, message: `Not enough coins. Need ${theme.cost} Rasa Coins.`, newBalance: result.newBalance };
  }

  await setActiveTheme(userId, theme.id);
  return { success: true, message: `${theme.name} theme equipped!`, newBalance: result.newBalance };
}
