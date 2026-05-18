import { describe, expect, it } from 'vitest';
import { selectAutoRemoveCandidates } from './auto-remove-by-score.js';
import type { PrioritizedItem } from './queue-types.js';

const item = (
  id: string,
  total: number,
  reportCount: number,
  overrides: Partial<PrioritizedItem> = {}
): PrioritizedItem => ({
  id,
  kind: 'post',
  title: 't',
  authorName: 'u/x',
  permalink: '/r/test/comments/x',
  locked: false,
  ignoringReports: false,
  breakdown: {
    total,
    reportCount,
    bannedKeywordHits: 0,
    isLowKarmaAuthor: false,
    repeatedReportBonus: 0,
    queueAgeHours: 0,
    isYoungAccount: false,
    modReportCount: 0,
    flairBonus: 0,
    reportsPoints: 0,
    keywordPoints: 0,
    lowKarmaPoints: 0,
    repeatedPoints: 0,
    queueAgePoints: 0,
    youngAccountPoints: 0,
    modReportPoints: 0,
    flairPoints: 0,
  },
  ...overrides,
});

describe('selectAutoRemoveCandidates', () => {
  it('returns empty when threshold is 0', () => {
    const scored = [item('t3_a', 99, 5), item('t3_b', 100, 5)];
    expect(selectAutoRemoveCandidates(scored, 0, 0, 10)).toEqual([]);
  });

  it('filters by score and min reports, sorts by score desc, caps count', () => {
    const scored = [
      item('t3_low', 30, 1),
      item('t3_mid', 50, 2),
      item('t3_hi', 80, 3),
      item('t3_no_rep', 100, 0),
      item('t3_top', 90, 2),
    ];
    const got = selectAutoRemoveCandidates(scored, 40, 2, 2);
    expect(got.map((i) => i.id)).toEqual(['t3_top', 't3_hi']);
  });
});
