import { context, redis, scheduler } from '@devvit/web/server';

/** Task name must match `devvit.json` → scheduler.tasks.refresh-queue */
export const QUEUE_REFRESH_TASK_NAME = 'refresh-queue';

/** Treat cache older than this as stale (cron runs every 5 min). */
export const QUEUE_STALE_MS = 4 * 60 * 1000;

const REFRESH_LOCK_SECONDS = 300;

const refreshLockKey = (subredditId: string): string =>
  `queueiq:refresh-lock:${subredditId}`;

export const isQueueCacheStale = (refreshedAt: string | null): boolean => {
  if (!refreshedAt) {
    return true;
  }
  const age = Date.now() - new Date(refreshedAt).getTime();
  return !Number.isFinite(age) || age > QUEUE_STALE_MS;
};

export const isQueueRefreshInFlight = async (): Promise<boolean> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return false;
  }
  try {
    const lock = await redis.get(refreshLockKey(subredditId));
    return lock === '1';
  } catch {
    return false;
  }
};

export const releaseQueueRefreshLock = async (): Promise<void> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return;
  }
  try {
    await redis.del(refreshLockKey(subredditId));
  } catch {
    /* ignore */
  }
};

/** Returns true when a background rebuild was scheduled. */
export const scheduleQueueRefresh = async (): Promise<boolean> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return false;
  }

  const lockKey = refreshLockKey(subredditId);
  try {
    const existing = await redis.get(lockKey);
    if (existing === '1') {
      return false;
    }
    await redis.set(lockKey, '1');
    await redis.expire(lockKey, REFRESH_LOCK_SECONDS);
  } catch (error) {
    console.error('scheduleQueueRefresh lock failed', error);
    return false;
  }

  try {
    await scheduler.runJob({
      name: QUEUE_REFRESH_TASK_NAME,
      data: { subredditId },
      runAt: new Date(),
    });
    return true;
  } catch (error) {
    console.error('scheduleQueueRefresh runJob failed', error);
    await releaseQueueRefreshLock();
    return false;
  }
};
