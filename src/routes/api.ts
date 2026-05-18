import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type {
  ModActionRequest,
  ModActionResponse,
  QueueErrorResponse,
  QueueResponse,
  QueueSettingsDto,
} from '../shared/api.js';
import { loadAuditLog } from '../core/audit-log.js';
import { REDIS_KEYS } from '../core/constants.js';
import { loadQueueConfig } from '../core/config.js';
import { getInstallSettingsUrl } from '../core/install-settings-url.js';
import { isModActionKind, isQueueThingId, performModAction } from '../core/mod-actions.js';
import { buildMockPrioritizedQueue } from '../core/mock-queue.js';
import { buildLivePrioritizedQueue, prioritizeModQueue } from '../core/queue.js';
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

const loadQueuePayload = async (limit = 50): Promise<QueueResponse> => {
  const { config, fromInstall } = await loadQueueConfig();
  const items = await buildLivePrioritizedQueue(limit, config);
  const subredditId = context.subredditId;
  let refreshedAt: string | null = null;

  if (subredditId) {
    refreshedAt =
      (await redis.get(REDIS_KEYS.lastRefresh(subredditId)).catch(() => null)) ??
      null;
  }

  if (!refreshedAt) {
    refreshedAt = new Date().toISOString();
  }

  const subredditName = context.subredditName ?? 'unknown';

  return {
    type: 'queue',
    appVersion: context.appVersion ?? 'unknown',
    subredditName,
    itemCount: items.length,
    refreshedAt,
    settings: toSettingsDto(config),
    settingsUrl: getInstallSettingsUrl(subredditName),
    settingsFromInstall: fromInstall,
    removalReasons: await loadRemovalReasons(subredditName),
    auditLog: await loadAuditLog(25),
    items: items.map(toQueueItemDto),
  };
};

api.get('/queue/mock', async (c) => {
  const { config, fromInstall } = await loadQueueConfig();
  const items = buildMockPrioritizedQueue(25, config);
  return c.json({
    type: 'queue',
    appVersion: 'mock',
    subredditName: 'mock',
    itemCount: items.length,
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
    return c.json(await loadQueuePayload(50));
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
    return c.json(await loadQueuePayload(50));
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
    const queue = await loadQueuePayload(50);
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
