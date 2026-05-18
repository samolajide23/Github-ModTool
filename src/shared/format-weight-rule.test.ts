import { describe, expect, it } from 'vitest';
import { formatWeightRule } from './format-weight-rule.js';

describe('formatWeightRule', () => {
  it('formats per-count weights without multiply symbol', () => {
    expect(formatWeightRule('Reports', 3000, 'per report').value).toBe('3000 pts per report');
  });

  it('formats flat low-karma bonus', () => {
    expect(
      formatWeightRule('Low-karma author', 4000, 'flat if below threshold').value
    ).toBe('4000 pts once if below karma threshold');
  });

  it('marks zero as disabled', () => {
    expect(formatWeightRule('Reports', 0, 'per report').value).toBe('disabled');
  });
});
