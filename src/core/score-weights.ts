import {
  DEFAULT_SCORE_WEIGHTS,
  WEIGHT_LIMITS,
  type ScoreWeights,
} from './constants.js';

export const clampWeight = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(WEIGHT_LIMITS.max, Math.max(WEIGHT_LIMITS.min, Math.round(value)));
};

export const normalizeScoreWeights = (raw: Partial<ScoreWeights>): ScoreWeights => ({
  reports: clampWeight(raw.reports ?? DEFAULT_SCORE_WEIGHTS.reports),
  bannedKeyword: clampWeight(raw.bannedKeyword ?? DEFAULT_SCORE_WEIGHTS.bannedKeyword),
  lowKarmaAuthor: clampWeight(raw.lowKarmaAuthor ?? DEFAULT_SCORE_WEIGHTS.lowKarmaAuthor),
  repeatedReporter: clampWeight(
    raw.repeatedReporter ?? DEFAULT_SCORE_WEIGHTS.repeatedReporter
  ),
});
