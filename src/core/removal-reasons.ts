import { context, reddit, redis } from '@devvit/web/server';
import type { RemovalReasonDto } from '../shared/api.js';

const REMOVAL_REASONS_TTL_SECONDS = 3600;

const cacheKey = (subredditName: string): string =>
  `queueiq:removal-reasons:${subredditName}`;

export const loadRemovalReasons = async (
  subredditName: string
): Promise<RemovalReasonDto[]> => {
  const key = cacheKey(subredditName);
  try {
    const cached = await redis.get(key);
    if (cached) {
      const parsed = JSON.parse(cached) as RemovalReasonDto[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('loadRemovalReasons cache read failed', error);
  }

  try {
    const reasons = await reddit.getSubredditRemovalReasons(subredditName);
    const dto = reasons.map((r) => ({
      id: r.id,
      title: r.title,
    }));
    try {
      await redis.set(key, JSON.stringify(dto));
      await redis.expire(key, REMOVAL_REASONS_TTL_SECONDS);
    } catch (error) {
      console.error('loadRemovalReasons cache write failed', error);
    }
    return dto;
  } catch (error) {
    console.error('loadRemovalReasons failed', error);
    return [];
  }
};

export const clearRemovalReasonsCache = async (): Promise<void> => {
  const name = context.subredditName;
  if (!name) {
    return;
  }
  try {
    await redis.del(cacheKey(name));
  } catch {
    /* ignore */
  }
};
