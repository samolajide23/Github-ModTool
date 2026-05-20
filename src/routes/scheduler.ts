import { Hono } from 'hono';
import type { TaskRequest, TaskResponse } from '@devvit/web/server';
import { prioritizeModQueue } from '../core/queue.js';
import { releaseQueueRefreshLock } from '../core/queue-refresh.js';

export const schedulerRoutes = new Hono();

schedulerRoutes.post('/refresh-queue', async (c) => {
  await c.req.json<TaskRequest>();
  try {
    const result = await prioritizeModQueue();
    console.log(
      `QueueIQ refreshed r/${result.subredditName}: ${result.itemCount} items (top score ${result.topItem?.breakdown.total ?? 0})`
    );
    return c.json<TaskResponse>({ status: 'ok' }, 200);
  } finally {
    await releaseQueueRefreshLock();
  }
});
