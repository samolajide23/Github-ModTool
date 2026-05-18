/** Decimal precision for weights, totals, and install settings. */
export const SCORE_DECIMAL_PLACES = 4;

export const roundScoreValue = (
  value: number,
  places: number = SCORE_DECIMAL_PLACES
): number => {
  if (!Number.isFinite(value)) {
    return 0;
  }
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
};

/** Display score/weight without trailing zeros (e.g. 3.5, not 3.5000). */
export const formatScoreNumber = (value: number): string => {
  const rounded = roundScoreValue(value);
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  return String(rounded);
};
