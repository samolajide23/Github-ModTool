import { DEFAULT_SCORE_WEIGHTS, type ScoreWeights } from './constants.js';

export type ScoreInput = {
  reportCount: number;
  bannedKeywordHits: number;
  isLowKarmaAuthor: boolean;
  repeatedReportBonus: number;
};

export type ScoreBreakdown = ScoreInput & {
  total: number;
  reportsPoints: number;
  keywordPoints: number;
  lowKarmaPoints: number;
  repeatedPoints: number;
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
  const reportsPoints = input.reportCount * weights.reports;
  const keywordPoints = input.bannedKeywordHits * weights.bannedKeyword;
  const lowKarmaPoints = input.isLowKarmaAuthor ? weights.lowKarmaAuthor : 0;
  const repeatedPoints = input.repeatedReportBonus * weights.repeatedReporter;

  return {
    ...input,
    reportsPoints,
    keywordPoints,
    lowKarmaPoints,
    repeatedPoints,
    total: reportsPoints + keywordPoints + lowKarmaPoints + repeatedPoints,
  };
};

export const formatScoreBreakdown = (
  breakdown: ScoreBreakdown,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): string => {
  const parts = [
    `Total: ${breakdown.total}`,
    `Reports (${breakdown.reportCount}×${weights.reports}): +${breakdown.reportsPoints}`,
  ];

  if (breakdown.keywordPoints > 0) {
    parts.push(
      `Keywords (${breakdown.bannedKeywordHits}×${weights.bannedKeyword}): +${breakdown.keywordPoints}`
    );
  }

  if (breakdown.lowKarmaPoints > 0) {
    parts.push(`Low karma: +${breakdown.lowKarmaPoints}`);
  }

  if (breakdown.repeatedPoints > 0) {
    parts.push(
      `Repeat reports (${breakdown.repeatedReportBonus}×${weights.repeatedReporter}): +${breakdown.repeatedPoints}`
    );
  }

  return parts.join(' · ');
};

/** Compact breakdown for mod-tool UI (no formula detail). */
export const formatScoreBreakdownShort = (breakdown: ScoreBreakdown): string => {
  const parts: string[] = [];

  if (breakdown.reportsPoints > 0) {
    parts.push(`+${breakdown.reportsPoints} reports`);
  }
  if (breakdown.keywordPoints > 0) {
    parts.push(`+${breakdown.keywordPoints} keywords`);
  }
  if (breakdown.lowKarmaPoints > 0) {
    parts.push(`+${breakdown.lowKarmaPoints} low karma`);
  }
  if (breakdown.repeatedPoints > 0) {
    parts.push(`+${breakdown.repeatedPoints} repeat reports`);
  }

  return parts.length > 0 ? parts.join(' · ') : 'No extra risk signals';
};
