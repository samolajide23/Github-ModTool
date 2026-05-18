import {
  DEFAULT_SCORE_WEIGHTS,
  WEIGHT_LIMITS,
  type ScoreWeights,
} from './constants.js';
import { roundScoreValue } from './score-values.js';

export const clampWeight = (value: number): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const clamped = Math.min(WEIGHT_LIMITS.max, Math.max(WEIGHT_LIMITS.min, value));
  return roundScoreValue(clamped);
};

export const normalizeScoreWeights = (raw: Partial<ScoreWeights>): ScoreWeights => ({
  reports: clampWeight(raw.reports ?? DEFAULT_SCORE_WEIGHTS.reports),
  bannedKeyword: clampWeight(raw.bannedKeyword ?? DEFAULT_SCORE_WEIGHTS.bannedKeyword),
  lowKarmaAuthor: clampWeight(raw.lowKarmaAuthor ?? DEFAULT_SCORE_WEIGHTS.lowKarmaAuthor),
  repeatedReporter: clampWeight(
    raw.repeatedReporter ?? DEFAULT_SCORE_WEIGHTS.repeatedReporter
  ),
  queueAgePerHour: clampWeight(raw.queueAgePerHour ?? DEFAULT_SCORE_WEIGHTS.queueAgePerHour),
  youngAccount: clampWeight(raw.youngAccount ?? DEFAULT_SCORE_WEIGHTS.youngAccount),
  modReport: clampWeight(raw.modReport ?? DEFAULT_SCORE_WEIGHTS.modReport),
});
