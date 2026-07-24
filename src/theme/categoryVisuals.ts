import type { RestaurantCategory } from '@/types';

/**
 * Central visual identity for each restaurant category — a warm, appetising
 * gradient + an emoji. Used by the premium cover-fallback system so a place
 * without a photo still looks intentional and branded (never a broken gray box).
 *
 * Gradients lean into the Rasa palette (deep chili / turmeric / warm earth) so
 * the app feels cohesive even before real photography lands.
 */
export interface CategoryVisual {
  gradient: [string, string];
  emoji: string;
}

const DEFAULT_VISUAL: CategoryVisual = { gradient: ['#D94841', '#8B1E1E'], emoji: '🍽️' };

export const CATEGORY_VISUALS: Record<RestaurantCategory, CategoryVisual> = {
  hawker:       { gradient: ['#F59E0B', '#B45309'], emoji: '🍜' },
  mamak:        { gradient: ['#16A34A', '#065F46'], emoji: '🥛' },
  cafe:         { gradient: ['#8B5CF6', '#5B21B6'], emoji: '☕' },
  kopitiam:     { gradient: ['#EA7317', '#9A3412'], emoji: '🍳' },
  restaurant:   { gradient: ['#D94841', '#991B1B'], emoji: '🍽️' },
  fine_dining:  { gradient: ['#3B82F6', '#1E3A8A'], emoji: '🥂' },
  food_court:   { gradient: ['#EC4899', '#9D174D'], emoji: '🍱' },
  night_market: { gradient: ['#4B5563', '#111827'], emoji: '🌙' },
  rooftop:      { gradient: ['#0EA5E9', '#0C4A6E'], emoji: '🌆' },
  bar:          { gradient: ['#7C3AED', '#4C1D95'], emoji: '🍸' },
  fast_food:    { gradient: ['#EF4444', '#991B1B'], emoji: '🍔' },
  buffet:       { gradient: ['#F97316', '#9A3412'], emoji: '🍲' },
  food_truck:   { gradient: ['#0D9488', '#134E4A'], emoji: '🚚' },
};

export function categoryVisual(category?: RestaurantCategory | string | null): CategoryVisual {
  if (category && category in CATEGORY_VISUALS) {
    return CATEGORY_VISUALS[category as RestaurantCategory];
  }
  return DEFAULT_VISUAL;
}
