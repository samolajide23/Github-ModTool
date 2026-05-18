import { roundScoreValue } from './score-values.js';

const parseRawNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === '') {
      return null;
    }
    const parsed = Number(trimmed);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
};

/** Whole numbers only (karma threshold, days, min report counts). */
export const parseInstallNumber = (value: unknown, fallback: number): number => {
  const parsed = parseRawNumber(value);
  if (parsed === null) {
    return fallback;
  }
  return Math.max(0, Math.round(parsed));
};

/** Scoring weights, thresholds, and flair points (decimals allowed). */
export const parseInstallDecimal = (value: unknown, fallback: number): number => {
  const parsed = parseRawNumber(value);
  if (parsed === null) {
    return fallback;
  }
  return roundScoreValue(Math.max(0, parsed));
};

export const parseInstallString = (value: unknown, fallback: string): string => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }
  return fallback;
};
