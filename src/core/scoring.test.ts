import { describe, expect, it } from 'vitest';
import { DEFAULT_SCORE_WEIGHTS } from './constants.js';
import {
  computeScore,
  countBannedKeywordHits,
  formatScoreBreakdownShort,
  repeatedReportBonus,
} from './scoring.js';

describe('countBannedKeywordHits', () => {
  it('counts keyword matches in text', () => {
    expect(
      countBannedKeywordHits('This is a scam and phishing attempt', ['scam', 'phishing'])
    ).toBe(2);
  });
});

describe('repeatedReportBonus', () => {
  it('returns zero for a single report', () => {
    expect(repeatedReportBonus(1, 1)).toBe(0);
  });

  it('counts extra report events', () => {
    expect(repeatedReportBonus(4, 2)).toBe(3);
  });
});

describe('computeScore', () => {
  it('applies the hackathon scoring formula', () => {
    const breakdown = computeScore({
      reportCount: 3,
      bannedKeywordHits: 1,
      isLowKarmaAuthor: true,
      repeatedReportBonus: 2,
      queueAgeHours: 0,
      isYoungAccount: false,
      modReportCount: 0,
      flairBonus: 0,
    });

    expect(breakdown.total).toBe(3 * 3 + 1 * 5 + 4 + 2 * 2);
    expect(breakdown.total).toBe(22);
  });

  it('applies decimal weights', () => {
    const breakdown = computeScore(
      {
        reportCount: 2,
        bannedKeywordHits: 0,
        isLowKarmaAuthor: false,
        repeatedReportBonus: 0,
        queueAgeHours: 0,
        isYoungAccount: false,
        modReportCount: 0,
        flairBonus: 0,
      },
      { ...DEFAULT_SCORE_WEIGHTS, reports: 2.5 }
    );
    expect(breakdown.reportsPoints).toBe(5);
    expect(breakdown.total).toBe(5);
  });
});

describe('formatScoreBreakdownShort', () => {
  it('lists only non-zero contributors', () => {
    const text = formatScoreBreakdownShort(
      computeScore({
        reportCount: 1,
        bannedKeywordHits: 2,
        isLowKarmaAuthor: false,
        repeatedReportBonus: 0,
        queueAgeHours: 0,
        isYoungAccount: false,
        modReportCount: 0,
        flairBonus: 0,
      })
    );

    expect(text).toContain('+3 reports');
    expect(text).toContain('+10 keywords');
    expect(text).not.toContain('low karma');
  });
});
