import { describe, expect, it } from 'vitest';
import {
  formatQueueItemHelp,
  formatQueueSummary,
  shortenPermalink,
  truncateText,
  type PrioritizedItem,
} from './queue.js';

const sampleItem = (total: number, title: string): PrioritizedItem => ({
  id: 't3_test',
  kind: 'post',
  title,
  authorName: 'u/mod',
  permalink: 'https://www.reddit.com/r/demo/comments/abc123/demo_post/',
  locked: false,
  ignoringReports: false,
  breakdown: {
    reportCount: 1,
    bannedKeywordHits: total > 10 ? 2 : 0,
    isLowKarmaAuthor: false,
    repeatedReportBonus: 0,
    total,
    reportsPoints: 3,
    keywordPoints: total > 10 ? 10 : 0,
    lowKarmaPoints: 0,
    repeatedPoints: 0,
    queueAgeHours: 0,
    isYoungAccount: false,
    modReportCount: 0,
    flairBonus: 0,
    queueAgePoints: 0,
    youngAccountPoints: 0,
    modReportPoints: 0,
    flairPoints: 0,
  },
});

describe('truncateText', () => {
  it('truncates long strings', () => {
    expect(truncateText('hello world', 8)).toBe('hello w…');
  });
});

describe('shortenPermalink', () => {
  it('returns pathname only', () => {
    expect(
      shortenPermalink('https://www.reddit.com/r/demo/comments/abc123/title/')
    ).toBe('/r/demo/comments/abc123/title/');
  });
});

describe('formatQueueSummary', () => {
  it('separates items and omits full https URLs', () => {
    const text = formatQueueSummary([
      sampleItem(28, '[DEMO HIGH] Free money crypto scam'),
      sampleItem(3, '[DEMO LOW] Weekly thread'),
    ]);

    expect(text).toContain('────────────');
    expect(text).toContain('28 pts');
    expect(text).not.toContain('https://www.reddit.com');
    expect(text).toContain('/r/demo/comments/abc123');
  });
});

describe('formatQueueItemHelp', () => {
  it('includes title, author, and short breakdown', () => {
    const help = formatQueueItemHelp(sampleItem(28, 'Scam post title'));
    expect(help).toContain('Scam post title');
    expect(help).toContain('u/mod');
    expect(help).toContain('+3 reports');
  });
});
