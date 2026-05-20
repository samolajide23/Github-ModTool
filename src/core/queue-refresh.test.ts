import { describe, expect, it } from 'vitest';
import { isQueueCacheStale, QUEUE_STALE_MS } from './queue-refresh.js';

describe('isQueueCacheStale', () => {
  it('returns true when refreshedAt is null', () => {
    expect(isQueueCacheStale(null)).toBe(true);
  });

  it('returns false for fresh cache', () => {
    const recent = new Date(Date.now() - 60_000).toISOString();
    expect(isQueueCacheStale(recent)).toBe(false);
  });

  it('returns true when cache exceeds stale threshold', () => {
    const old = new Date(Date.now() - QUEUE_STALE_MS - 1).toISOString();
    expect(isQueueCacheStale(old)).toBe(true);
  });
});
