import { describe, expect, it } from 'vitest';
import { parseInstallNumber, parseInstallString } from './install-settings-parse.js';

describe('parseInstallNumber', () => {
  it('parses numeric strings from install settings', () => {
    expect(parseInstallNumber('10', 3)).toBe(10);
    expect(parseInstallNumber('0', 3)).toBe(0);
  });

  it('keeps numbers and uses fallback for invalid values', () => {
    expect(parseInstallNumber(7, 3)).toBe(7);
    expect(parseInstallNumber('nope', 3)).toBe(3);
    expect(parseInstallNumber(undefined, 3)).toBe(3);
  });
});

describe('parseInstallString', () => {
  it('returns trimmed strings or fallback', () => {
    expect(parseInstallString('  scam, spam  ', 'default')).toBe('  scam, spam  ');
    expect(parseInstallString('', 'default')).toBe('default');
  });
});
