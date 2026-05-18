import { describe, expect, it } from 'vitest';
import {
  parseInstallDecimal,
  parseInstallNumber,
  parseInstallString,
} from './install-settings-parse.js';

describe('parseInstallNumber', () => {
  it('parses numeric strings from install settings', () => {
    expect(parseInstallNumber('10', 3)).toBe(10);
    expect(parseInstallNumber('0', 3)).toBe(0);
  });

  it('rounds decimals to whole numbers', () => {
    expect(parseInstallNumber('99.7', 100)).toBe(100);
  });

  it('keeps numbers and uses fallback for invalid values', () => {
    expect(parseInstallNumber(7, 3)).toBe(7);
    expect(parseInstallNumber('nope', 3)).toBe(3);
    expect(parseInstallNumber(undefined, 3)).toBe(3);
  });
});

describe('parseInstallDecimal', () => {
  it('preserves decimal weights from install settings', () => {
    expect(parseInstallDecimal('3.5', 3)).toBe(3.5);
    expect(parseInstallDecimal('0.25', 1)).toBe(0.25);
  });

  it('uses fallback for invalid values', () => {
    expect(parseInstallDecimal('nope', 2.5)).toBe(2.5);
    expect(parseInstallDecimal(undefined, 4)).toBe(4);
  });
});

describe('parseInstallString', () => {
  it('returns trimmed strings or fallback', () => {
    expect(parseInstallString('  scam, spam  ', 'default')).toBe('  scam, spam  ');
    expect(parseInstallString('', 'default')).toBe('default');
  });
});
