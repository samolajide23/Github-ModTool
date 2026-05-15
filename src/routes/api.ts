import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import type { QueueErrorResponse, QueueResponse, QueueSettingsDto } from '../shared/api.js';
import { REDIS_KEYS } from '../core/constants.js';
import { loadQueueConfig } from '../core/config.js';
import { getInstallSettingsUrl } from '../core/install-settings-url.js';
import { buildMockPrioritizedQueue } from '../core/mock-queue.js';
import { buildLivePrioritizedQueue, prioritizeModQueue } from '../core/queue.js';
import { toQueueItemDto } from '../core/queue-dto.js';

export const api = new Hono();

const toSettingsDto = (config: Awaited<ReturnType<typeof loadQueueConfig>>['config']): QueueSettingsDto => ({
  bannedKeywords: config.bannedKeywords.join(', '),
  lowKarmaThreshold: config.lowKarmaThreshold,
  weights: { ...config.weights },
});

const loadQueuePayload = async (limit = 25): Promise<QueueResponse> => {
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
    subredditName,
    itemCount: items.length,
    refreshedAt,
    settings: toSettingsDto(config),
    settingsUrl: getInstallSettingsUrl(subredditName),
    settingsFromInstall: fromInstall,
    items: items.map(toQueueItemDto),
  };
};

api.get('/queue/mock', async (c) => {
  const { config, fromInstall } = await loadQueueConfig();
  const items = buildMockPrioritizedQueue(25, config.weights);
  return c.json({
    type: 'queue',
    subredditName: 'mock',
    itemCount: items.length,
    refreshedAt: new Date().toISOString(),
    settings: toSettingsDto(config),
    settingsUrl: getInstallSettingsUrl('queue_toolk_dev'),
    settingsFromInstall: fromInstall,
    items: items.map(toQueueItemDto),
  } satisfies QueueResponse);
});

api.get('/queue', async (c) => {
  try {
    return c.json(await loadQueuePayload(25));
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
    return c.json(await loadQueuePayload(25));
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
