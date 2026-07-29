import type { Restaurant } from '@/types';

// Bayesian weighted rating (IMDB-style) — rewards a HIGH rating AND enough
// reviews, so 4.9★ from 3 people can't outrank 4.6★ from thousands. Uses Rasa's
// own review data when it exists, else falls back to Google's rating × count so a
// cold-start DB still surfaces genuinely good places.
//   weighted = (v/(v+m))·R + (m/(v+m))·C
export const BAYES_MIN = 20;    // reviews needed before a place's own average dominates
export const BAYES_PRIOR = 3.8; // global prior mean (0–5) new/low-count places regress to

export function bayesianScore(r: Restaurant): number {
  const hasRasa = (r.total_reviews ?? 0) > 0;
  const R = hasRasa ? (r.overall_rating ?? 0) : (r.google_rating ?? 0);
  const v = hasRasa ? (r.total_reviews ?? 0) : (r.google_rating_count ?? 0);
  if (v <= 0 && R <= 0) return 0;
  return (v / (v + BAYES_MIN)) * R + (BAYES_MIN / (v + BAYES_MIN)) * BAYES_PRIOR;
}
