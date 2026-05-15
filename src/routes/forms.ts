import { Hono } from 'hono';
import type { UiResponse } from '@devvit/web/shared';
export const forms = new Hono();

forms.post('/prioritized-queue-submit', async (c) => {
  await c.req.json();

  return c.json<UiResponse>({}, 200);
});

forms.post('/item-score-submit', async (c) => {
  return c.json<UiResponse>({}, 200);
});
