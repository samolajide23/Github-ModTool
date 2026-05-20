import { describe, expect, it } from 'vitest';
import type { QueueItemDto } from './api.js';
import { sortQueueItems } from './sort-queue-items.js';

const item = (
  id: string,
  total: number,
  reportCount: number,
  queueAgeHours: number
): QueueItemDto => ({
  id,
  kind: 'post',
  title: id,
  authorName: 'u/test',
  permalink: `/r/x/${id}`,
  locked: false,
  ignoringReports: false,
  url: `https://reddit.com/r/x/${id}`,
  breakdownShort: `${total}`,
  breakdown: {
    total,
    reportCount,
    bannedKeywordHits: 0,
    isLowKarmaAuthor: false,
    repeatedReportBonus: 0,
    queueAgeHours,
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
});

describe('sortQueueItems', () => {
  const items = [
    item('a', 10, 2, 5),
    item('b', 20, 1, 10),
    item('c', 15, 4, 1),
  ];

  it('sorts by score descending by default', () => {
    const ids = sortQueueItems(items, 'score').map((i) => i.id);
    expect(ids).toEqual(['b', 'c', 'a']);
  });

  it('sorts oldest first by queue age hours', () => {
    const ids = sortQueueItems(items, 'oldest').map((i) => i.id);
    expect(ids).toEqual(['b', 'a', 'c']);
  });

  it('sorts newest first by queue age hours', () => {
    const ids = sortQueueItems(items, 'newest').map((i) => i.id);
    expect(ids).toEqual(['c', 'a', 'b']);
  });

  it('sorts by report count then score', () => {
    const ids = sortQueueItems(items, 'most-reported').map((i) => i.id);
    expect(ids).toEqual(['c', 'a', 'b']);
  });
});
