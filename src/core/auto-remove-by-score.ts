import { context, redis } from '@devvit/web/server';
import { REDIS_KEYS } from './constants.js';
import type { QueueConfig } from './config.js';
import { performModAction } from './mod-actions.js';
import type { PrioritizedItem } from './queue-types.js';

/** Avoid removing dozens of items in one scheduler tick if something is misconfigured. */
export const MAX_AUTO_REMOVES_PER_REFRESH = 15;

const COOLDOWN_SECONDS = 6 * 60 * 60;

export const selectAutoRemoveCandidates = (
  scored: PrioritizedItem[],
  threshold: number,
  minReports: number,
  maxPerRun: number
): PrioritizedItem[] => {
  if (threshold <= 0 || maxPerRun <= 0) {
    return [];
  }
  return scored
    .filter(
      (item) =>
        item.breakdown.total >= threshold && item.breakdown.reportCount >= minReports
    )
    .sort((a, b) => b.breakdown.total - a.breakdown.total)
    .slice(0, maxPerRun);
};

/**
 * Removes mod-queue items whose QueueIQ score is at or above the install threshold.
 * **0 threshold = disabled.** Uses normal remove + mod note; audit log entries come from performModAction.
 */
export const applyAutoRemoveByScore = async (
  scored: PrioritizedItem[],
  config: QueueConfig
): Promise<PrioritizedItem[]> => {
  const threshold = config.autoRemoveAboveScore;
  if (threshold <= 0) {
    return scored;
  }

  const subredditId = context.subredditId;
  if (!subredditId) {
    return scored;
  }

  const minReports = config.autoRemoveMinReports;
  const candidates = selectAutoRemoveCandidates(
    scored,
    threshold,
    minReports,
    MAX_AUTO_REMOVES_PER_REFRESH
  );

  const removedIds = new Set<string>();

  for (const item of candidates) {
    const cooldownKey = REDIS_KEYS.autoRemoveCooldown(subredditId, item.id);
    try {
      const cooling = await redis.get(cooldownKey);
      if (cooling) {
        continue;
      }

      await performModAction(item.id, 'remove', {
        modNote: `QueueIQ auto-remove: score ${item.breakdown.total} ≥ threshold ${threshold} (reports ${item.breakdown.reportCount})`,
      });
      removedIds.add(item.id);
    } catch (error) {
      console.error(`QueueIQ auto-remove failed for ${item.id}`, error);
      try {
        await redis.set(cooldownKey, '1');
        await redis.expire(cooldownKey, COOLDOWN_SECONDS);
      } catch (redisErr) {
        console.error('QueueIQ auto-remove cooldown set failed', redisErr);
      }
    }
  }

  if (removedIds.size > 0) {
    console.log(`QueueIQ: auto-removed ${removedIds.size} item(s) above score ${threshold}`);
  }

  return scored.filter((i) => !removedIds.has(i.id));
};
