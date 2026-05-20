import { context, redis } from '@devvit/web/server';
import { QUEUE_FETCH_LIMIT } from '../shared/api.js';
import type { PrioritizedItem } from './queue-types.js';

export type CachedQueuePayload = {
  refreshedAt: string;
  totalInQueue: number;
  items: PrioritizedItem[];
};

const cacheKey = (subredditId: string): string => `queueiq:cached-payload:${subredditId}`;

export const writeQueueCache = async (
  scored: readonly PrioritizedItem[]
): Promise<void> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return;
  }

  const payload: CachedQueuePayload = {
    refreshedAt: new Date().toISOString(),
    totalInQueue: scored.length,
    items: scored.slice(0, QUEUE_FETCH_LIMIT),
  };

  try {
    await redis.set(cacheKey(subredditId), JSON.stringify(payload));
  } catch (error) {
    console.error('writeQueueCache failed', error);
  }
};

export const readQueueCache = async (): Promise<CachedQueuePayload | null> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return null;
  }

  try {
    const raw = await redis.get(cacheKey(subredditId));
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as CachedQueuePayload;
    if (
      !parsed ||
      typeof parsed.refreshedAt !== 'string' ||
      !Array.isArray(parsed.items) ||
      typeof parsed.totalInQueue !== 'number'
    ) {
      return null;
    }
    return parsed;
  } catch (error) {
    console.error('readQueueCache failed', error);
    return null;
  }
};

export const clearQueueCache = async (): Promise<void> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return;
  }
  try {
    await redis.del(cacheKey(subredditId));
  } catch {
    /* ignore */
  }
};
