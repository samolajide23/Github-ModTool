import {
  DEFAULT_SCORE_WEIGHTS,
  MAX_QUEUE_AGE_HOURS,
  type ScoreWeights,
} from './constants.js';
import { formatScoreNumber, roundScoreValue } from './score-values.js';

export type ScoreInput = {
  reportCount: number;
  bannedKeywordHits: number;
  isLowKarmaAuthor: boolean;
  repeatedReportBonus: number;
  queueAgeHours: number;
  isYoungAccount: boolean;
  modReportCount: number;
  flairBonus: number;
};

export type ScoreBreakdown = ScoreInput & {
  total: number;
  reportsPoints: number;
  keywordPoints: number;
  lowKarmaPoints: number;
  repeatedPoints: number;
  queueAgePoints: number;
  youngAccountPoints: number;
  modReportPoints: number;
  flairPoints: number;
};

export const queueAgeHoursFromCreatedAt = (createdAtMs: number | undefined): number => {
  if (!createdAtMs || !Number.isFinite(createdAtMs)) {
    return 0;
  }
  const hours = Math.floor((Date.now() - createdAtMs) / (1000 * 60 * 60));
  return Math.min(Math.max(0, hours), MAX_QUEUE_AGE_HOURS);
};

export const countBannedKeywordHits = (
  text: string,
  bannedKeywords: string[]
): number => {
  if (!bannedKeywords.length) {
    return 0;
  }

  const haystack = text.toLowerCase();
  return bannedKeywords.reduce(
    (hits, keyword) => (haystack.includes(keyword) ? hits + 1 : hits),
    0
  );
};

/** Extra report events beyond the first (tracked via triggers + queue refresh). */
export const repeatedReportBonus = (
  reportHits: number,
  reportCount: number
): number => Math.max(0, Math.max(reportHits, reportCount) - 1);

export const computeScore = (
  input: ScoreInput,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): ScoreBreakdown => {
  const reportsPoints = roundScoreValue(input.reportCount * weights.reports);
  const keywordPoints = roundScoreValue(input.bannedKeywordHits * weights.bannedKeyword);
  const lowKarmaPoints = roundScoreValue(input.isLowKarmaAuthor ? weights.lowKarmaAuthor : 0);
  const repeatedPoints = roundScoreValue(input.repeatedReportBonus * weights.repeatedReporter);
  const queueAgePoints = roundScoreValue(input.queueAgeHours * weights.queueAgePerHour);
  const youngAccountPoints = roundScoreValue(input.isYoungAccount ? weights.youngAccount : 0);
  const modReportPoints = roundScoreValue(input.modReportCount * weights.modReport);
  const flairPoints = roundScoreValue(input.flairBonus);

  return {
    ...input,
    reportsPoints,
    keywordPoints,
    lowKarmaPoints,
    repeatedPoints,
    queueAgePoints,
    youngAccountPoints,
    modReportPoints,
    flairPoints,
    total: roundScoreValue(
      reportsPoints +
        keywordPoints +
        lowKarmaPoints +
        repeatedPoints +
        queueAgePoints +
        youngAccountPoints +
        modReportPoints +
        flairPoints
    ),
  };
};

export const formatScoreBreakdown = (
  breakdown: ScoreBreakdown,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): string => {
  const parts = [
    `Total: ${formatScoreNumber(breakdown.total)}`,
    `Reports (${breakdown.reportCount}×${formatScoreNumber(weights.reports)}): +${formatScoreNumber(breakdown.reportsPoints)}`,
  ];

  if (breakdown.keywordPoints > 0) {
    parts.push(
      `Keywords (${breakdown.bannedKeywordHits}×${formatScoreNumber(weights.bannedKeyword)}): +${formatScoreNumber(breakdown.keywordPoints)}`
    );
  }

  if (breakdown.lowKarmaPoints > 0) {
    parts.push(`Low karma: +${formatScoreNumber(breakdown.lowKarmaPoints)}`);
  }

  if (breakdown.repeatedPoints > 0) {
    parts.push(
      `Repeat reports (${breakdown.repeatedReportBonus}×${formatScoreNumber(weights.repeatedReporter)}): +${formatScoreNumber(breakdown.repeatedPoints)}`
    );
  }

  if (breakdown.queueAgePoints > 0) {
    parts.push(
      `Time in queue (${breakdown.queueAgeHours}h×${formatScoreNumber(weights.queueAgePerHour)}): +${formatScoreNumber(breakdown.queueAgePoints)}`
    );
  }

  if (breakdown.youngAccountPoints > 0) {
    parts.push(`Young account: +${formatScoreNumber(breakdown.youngAccountPoints)}`);
  }

  if (breakdown.modReportPoints > 0) {
    parts.push(
      `Mod reports (${breakdown.modReportCount}×${formatScoreNumber(weights.modReport)}): +${formatScoreNumber(breakdown.modReportPoints)}`
    );
  }

  if (breakdown.flairPoints > 0) {
    parts.push(`Flair bonus: +${formatScoreNumber(breakdown.flairPoints)}`);
  }

  return parts.join(' · ');
};

/** Compact breakdown for mod-tool UI (no formula detail). */
export const formatScoreBreakdownShort = (breakdown: ScoreBreakdown): string => {
  const parts: string[] = [];

  if (breakdown.reportsPoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.reportsPoints)} reports`);
  }
  if (breakdown.keywordPoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.keywordPoints)} keywords`);
  }
  if (breakdown.lowKarmaPoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.lowKarmaPoints)} low karma`);
  }
  if (breakdown.repeatedPoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.repeatedPoints)} repeat reports`);
  }
  if (breakdown.queueAgePoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.queueAgePoints)} queue age`);
  }
  if (breakdown.youngAccountPoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.youngAccountPoints)} young account`);
  }
  if (breakdown.modReportPoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.modReportPoints)} mod reports`);
  }
  if (breakdown.flairPoints > 0) {
    parts.push(`+${formatScoreNumber(breakdown.flairPoints)} flair`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'No extra risk signals';
};
