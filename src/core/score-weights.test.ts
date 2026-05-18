import { describe, expect, it } from 'vitest';
import { WEIGHT_LIMITS } from './constants.js';
import { clampWeight, normalizeScoreWeights } from './score-weights.js';

describe('score-weights', () => {
  it('preserves large install settings values within limits', () => {
    expect(
      normalizeScoreWeights({
        reports: 3000,
        bannedKeyword: 50_000,
        lowKarmaAuthor: 4000,
        repeatedReporter: 1000,
      })
    ).toEqual({
      reports: 3000,
      bannedKeyword: 50_000,
      lowKarmaAuthor: 4000,
      repeatedReporter: 1000,
      queueAgePerHour: 1,
      youngAccount: 3,
      modReport: 5,
    });
  });

  it('clamps above max', () => {
    expect(clampWeight(WEIGHT_LIMITS.max + 1)).toBe(WEIGHT_LIMITS.max);
  });

  it('preserves decimal weights', () => {
    expect(clampWeight(2.75)).toBe(2.75);
    expect(normalizeScoreWeights({ reports: 1.5 })).toMatchObject({ reports: 1.5 });
  });
});
