import { formatScoreNumber } from './format-score-number.js';

/** Human-readable scoring rule for the dashboard (matches computeScore math). */
export const formatWeightRule = (
  label: string,
  points: number,
  unit: string
): { label: string; value: string } => {
  if (points === 0) {
    return { label, value: 'disabled' };
  }

  const pts = formatScoreNumber(points);

  if (unit.includes('flat')) {
    return { label, value: `${pts} pts once if below karma threshold` };
  }

  return { label, value: `${pts} pts per ${unit.replace(/^per\s+/, '')}` };
};
