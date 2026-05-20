import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type {
  ModActionRequest,
  ModActionResponse,
  QueueErrorResponse,
  QueueResponse,
  QueueSettingsDto,
} from '../shared/api.js';
import { QUEUE_FETCH_LIMIT } from '../shared/api.js';
import { loadAuditLog } from '../core/audit-log.js';
import { REDIS_KEYS } from '../core/constants.js';
import { loadQueueConfig } from '../core/config.js';
import { getInstallSettingsUrl } from '../core/install-settings-url.js';
import { isModActionKind, isQueueThingId, performModAction } from '../core/mod-actions.js';
import { buildMockPrioritizedQueue } from '../core/mock-queue.js';
import {
  buildLivePrioritizedQueue,
  loadCachedPrioritizedQueue,
  prioritizeModQueue,
} from '../core/queue.js';
import { writeQueueCache } from '../core/queue-cache.js';
import { toQueueItemDto } from '../core/queue-dto.js';
import { loadRemovalReasons } from '../core/removal-reasons.js';
import { ModGuardError, requireSubredditModerator } from '../core/mod-guard.js';

export const api = new Hono();

/** Defense in depth: custom post UI is public to anyone with the URL; only mods may call APIs. */
api.use(async (c, next) => {
  try {
    await requireSubredditModerator();
  } catch (error) {
    if (error instanceof ModGuardError) {
      return c.json<QueueErrorResponse>(
        { type: 'error', message: error.message },
        error.status as 401 | 403
      );
    }
    console.error('QueueIQ mod guard unexpected error', error);
    return c.json<QueueErrorResponse>(
      {
        type: 'error',
        message:
          'Could not verify moderator access. Open QueueIQ from the subreddit mod menu while signed in, then refresh.',
      },
      500
    );
  }
  return next();
});

const toSettingsDto = (
  config: Awaited<ReturnType<typeof loadQueueConfig>>['config']
): QueueSettingsDto => ({
  bannedKeywords: config.bannedKeywords.join(', '),
  lowKarmaThreshold: config.lowKarmaThreshold,
  youngAccountMaxDays: config.youngAccountMaxDays,
  flairWeightRules: config.flairRulesRaw,
  weights: { ...config.weights },
  autoRemoveAboveScore: config.autoRemoveAboveScore,
  autoRemoveMinReports: config.autoRemoveMinReports,
});

const loadQueuePayload = async (options?: { forceRebuild?: boolean }): Promise<QueueResponse> => {
  const subredditName = context.subredditName ?? 'unknown';

  const [{ config, fromInstall }, removalReasons, auditLog, cached] = await Promise.all([
    loadQueueConfig(),
    loadRemovalReasons(subredditName),
    loadAuditLog(25),
    options?.forceRebuild ? Promise.resolve(null) : loadCachedPrioritizedQueue(),
  ]);

  let items = cached?.items ?? [];
  let totalInQueue = cached?.totalInQueue ?? 0;
  let refreshedAt = cached?.refreshedAt ?? null;

  if (!cached) {
    const scored = await buildLivePrioritizedQueue(undefined, config);
    await writeQueueCache(scored);
    items = scored.slice(0, QUEUE_FETCH_LIMIT);
    totalInQueue = scored.length;
    refreshedAt = new Date().toISOString();
    if (context.subredditId) {
      await redis
        .set(REDIS_KEYS.lastRefresh(context.subredditId), refreshedAt)
        .catch(() => undefined);
    }
  }

  return {
    type: 'queue',
    appVersion: context.appVersion ?? 'unknown',
    subredditName,
    totalInQueue,
    itemCount: totalInQueue,
    refreshedAt,
    settings: toSettingsDto(config),
    settingsUrl: getInstallSettingsUrl(subredditName),
    settingsFromInstall: fromInstall,
    removalReasons,
    auditLog,
    items: items.map(toQueueItemDto),
  };
};

api.get('/queue/mock', async (c) => {
  const { config, fromInstall } = await loadQueueConfig();
  const scored = buildMockPrioritizedQueue(QUEUE_FETCH_LIMIT, config);
  const items = scored.slice(0, QUEUE_FETCH_LIMIT);
  return c.json({
    type: 'queue',
    appVersion: 'mock',
    subredditName: 'mock',
    totalInQueue: scored.length,
    itemCount: scored.length,
    refreshedAt: new Date().toISOString(),
    settings: toSettingsDto(config),
    settingsUrl: getInstallSettingsUrl('queue_toolk_dev'),
    settingsFromInstall: fromInstall,
    removalReasons: [
      { id: 'mock-spam', title: 'Spam' },
      { id: 'mock-rule1', title: 'Rule violation' },
    ],
    auditLog: [],
    items: items.map(toQueueItemDto),
  } satisfies QueueResponse);
});

api.get('/queue', async (c) => {
  try {
    return c.json(await loadQueuePayload());
  } catch (error) {
    console.error('GET /api/queue failed', error);
    return c.json<QueueErrorResponse>(
      {
        type: 'error',
        message: 'Could not load the prioritized mod queue.',
      },
      500
    );
  }
});

api.post('/refresh', async (c) => {
  try {
    await prioritizeModQueue();
    return c.json(await loadQueuePayload({ forceRebuild: false }));
  } catch (error) {
    console.error('POST /api/refresh failed', error);
    return c.json<QueueErrorResponse>(
      {
        type: 'error',
        message: 'Could not refresh the mod queue.',
      },
      500
    );
  }
});

api.post('/items/action', async (c) => {
  let body: ModActionRequest;
  try {
    body = (await c.req.json()) as ModActionRequest;
  } catch {
    return c.json<QueueErrorResponse>(
      { type: 'error', message: 'Invalid request body.' },
      400
    );
  }

  const { id, action, note, modNote, removalReasonId, banUsername, banDurationDays } = body;
  if (!id || typeof id !== 'string' || !isQueueThingId(id)) {
    return c.json<QueueErrorResponse>(
      { type: 'error', message: 'A valid post or comment id is required.' },
      400
    );
  }
  if (!action || !isModActionKind(action)) {
    return c.json<QueueErrorResponse>(
      { type: 'error', message: 'A valid mod action is required.' },
      400
    );
  }

  try {
    await performModAction(id, action, {
      note,
      modNote,
      removalReasonId,
      banUsername,
      banDurationDays:
        typeof banDurationDays === 'number' && Number.isFinite(banDurationDays)
          ? Math.max(0, Math.floor(banDurationDays))
          : undefined,
    });
    await prioritizeModQueue();
    const queue = await loadQueuePayload({ forceRebuild: false });
    return c.json({
      type: 'mod-action',
      action,
      id,
      queue,
    } satisfies ModActionResponse);
  } catch (error) {
    console.error(`POST /api/items/action failed (${action} ${id})`, error);
    const message =
      error instanceof Error ? error.message : 'Could not perform that mod action.';
    return c.json<QueueErrorResponse>({ type: 'error', message }, 500);
  }
});
