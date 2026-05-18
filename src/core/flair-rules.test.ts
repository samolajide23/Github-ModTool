import { describe, expect, it } from 'vitest';
import { flairBonusFromRules, parseFlairRules } from './flair-rules.js';

describe('parseFlairRules', () => {
  it('parses label:points pairs', () => {
    const m = parseFlairRules('News:10, spam +5');
    expect(m.get('news')).toBe(10);
    expect(m.get('spam')).toBe(5);
  });

  it('parses decimal flair points', () => {
    const m = parseFlairRules('News:10.5, Meme:2.25');
    expect(m.get('news')).toBe(10.5);
    expect(m.get('meme')).toBe(2.25);
  });
});

describe('flairBonusFromRules', () => {
  it('returns highest matching bonus', () => {
    const rules = new Map([
      ['news', 10],
      ['announcement', 20],
    ]);
    expect(flairBonusFromRules('Community News', rules)).toBe(10);
    expect(flairBonusFromRules('Official Announcement', rules)).toBe(20);
  });
});
