import { bayesianScore, BAYES_PRIOR } from '../ranking';
import { isHalalFriendly } from '../halal';
import { distanceKm } from '../geo';
import type { Restaurant } from '@/types';

// Minimal Restaurant factory — only the fields bayesianScore reads matter.
const r = (o: Partial<Restaurant>): Restaurant => o as Restaurant;

describe('bayesianScore (ranking)', () => {
  it('regresses a low-volume high rating toward the prior', () => {
    const score = bayesianScore(r({ overall_rating: 5, total_reviews: 1 }));
    // 5★ from 1 review must land well below 5, near the prior.
    expect(score).toBeLessThan(5);
    expect(score).toBeGreaterThan(BAYES_PRIOR);
  });

  it('ranks a well-reviewed 4.6 above a 3-review 4.9 (the whole point)', () => {
    const popular = bayesianScore(r({ overall_rating: 4.6, total_reviews: 5000 }));
    const fluke = bayesianScore(r({ overall_rating: 4.9, total_reviews: 3 }));
    expect(popular).toBeGreaterThan(fluke);
  });

  it('falls back to Google rating when there are no Rasa reviews', () => {
    const score = bayesianScore(
      r({ total_reviews: 0, google_rating: 4.5, google_rating_count: 800 }),
    );
    expect(score).toBeGreaterThan(BAYES_PRIOR); // 4.5 with volume beats the 3.8 prior
  });

  it('returns 0 when there is no rating data at all', () => {
    expect(bayesianScore(r({ total_reviews: 0 }))).toBe(0);
  });
});

describe('isHalalFriendly', () => {
  it('accepts certified and muslim-friendly', () => {
    expect(isHalalFriendly(['halal_certified'])).toBe(true);
    expect(isHalalFriendly(['muslim_friendly'])).toBe(true);
    expect(isHalalFriendly(['vegetarian', 'muslim_friendly'])).toBe(true);
  });

  it('rejects non-halal, empty, and nullish', () => {
    expect(isHalalFriendly(['vegetarian'])).toBe(false);
    expect(isHalalFriendly([])).toBe(false);
    expect(isHalalFriendly(null)).toBe(false);
    expect(isHalalFriendly(undefined)).toBe(false);
  });
});

describe('distanceKm', () => {
  it('is ~0 for the same point', () => {
    const kl = { lat: 3.139, lng: 101.6869 };
    expect(distanceKm(kl, kl)).toBeCloseTo(0, 5);
  });

  it('gives a sane KL→Penang distance (~300 km)', () => {
    const kl = { lat: 3.139, lng: 101.6869 };
    const penang = { lat: 5.4164, lng: 100.3327 };
    const d = distanceKm(kl, penang);
    expect(d).toBeGreaterThan(250);
    expect(d).toBeLessThan(360);
  });
});
