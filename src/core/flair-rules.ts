import { clampWeight } from './score-weights.js';

/** Parse "News:+10, Discussion:5.5" into flair label → bonus points. */
export const parseFlairRules = (raw: string): Map<string, number> => {
  const rules = new Map<string, number>();
  if (!raw.trim()) {
    return rules;
  }

  for (const part of raw.split(/[,;\n]+/)) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const match = trimmed.match(/^([^:+]+)[:+]?\s*([+-]?\d+(?:\.\d+)?)$/);
    if (!match) {
      continue;
    }
    const label = match[1].trim().toLowerCase();
    const points = Number.parseFloat(match[2]);
    if (label && Number.isFinite(points)) {
      rules.set(label, clampWeight(points));
    }
  }

  return rules;
};

export const flairBonusFromRules = (
  flairText: string | undefined,
  rules: Map<string, number>
): number => {
  if (!flairText || rules.size === 0) {
    return 0;
  }

  const haystack = flairText.toLowerCase();
  let best = 0;
  for (const [label, points] of rules) {
    if (haystack.includes(label)) {
      best = Math.max(best, points);
    }
  }
  return best;
};
