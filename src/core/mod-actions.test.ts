import { describe, expect, it } from 'vitest';
import { isModActionKind, isQueueThingId } from './mod-actions.js';

describe('mod-actions', () => {
  it('accepts valid thing ids', () => {
    expect(isQueueThingId('t3_abc123')).toBe(true);
    expect(isQueueThingId('t1_xyz789')).toBe(true);
  });

  it('rejects invalid thing ids', () => {
    expect(isQueueThingId('')).toBe(false);
    expect(isQueueThingId('t2_nope')).toBe(false);
    expect(isQueueThingId('https://reddit.com')).toBe(false);
  });

  it('recognizes mod action kinds', () => {
    expect(isModActionKind('approve')).toBe(true);
    expect(isModActionKind('spam')).toBe(true);
    expect(isModActionKind('ignore-reports')).toBe(true);
    expect(isModActionKind('unignore-reports')).toBe(true);
    expect(isModActionKind('ban-user')).toBe(true);
    expect(isModActionKind('delete')).toBe(false);
  });
});
