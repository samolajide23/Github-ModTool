import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import { scoreQueueItemId } from '../core/queue.js';
import { getOrCreateDashboardPost } from '../core/dashboard-post.js';
import { readOnlyResultsForm } from '../core/form-fields.js';
import { loadQueueConfig } from '../core/config.js';
import { formatScoreBreakdown, formatScoreBreakdownShort } from '../core/scoring.js';

export const menu = new Hono();

menu.post('/open-dashboard', async (c) => {
  await c.req.json<MenuItemRequest>();

  try {
    const post = await getOrCreateDashboardPost({ createAsUser: true });
    return c.json<UiResponse>({ navigateTo: post.url }, 200);
  } catch (error) {
    console.error('Open dashboard failed', error);
    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Custom UI needs a Devvit post (playtest cannot create one). Run npm run demo in terminal for the React dashboard, or open reddit.com/r/queue_toolk_dev without ?playtest= and try again.',
          appearance: 'neutral',
        },
      },
      200
    );
  }
});

menu.post('/show-item-score', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  const targetId = request.targetId;

  if (!targetId) {
    return c.json<UiResponse>({ showToast: 'No item selected.' }, 200);
  }

  try {
    const { config } = await loadQueueConfig();
    const breakdown = await scoreQueueItemId(targetId);

    if (!breakdown) {
      return c.json<UiResponse>(
        { showToast: 'Could not load this queue item.' },
        200
      );
    }

    const details = [
      `Priority score: ${breakdown.total} pts`,
      formatScoreBreakdownShort(breakdown),
      '',
      formatScoreBreakdown(breakdown, config.weights),
      '',
      'Higher scores surface first in QueueIQ.',
    ].join('\n');

    return c.json<UiResponse>(
      {
        showForm: {
          name: 'itemScore',
          form: readOnlyResultsForm('QueueIQ priority score', details),
        },
      },
      200
    );
  } catch (error) {
    console.error('Score lookup failed', error);
    return c.json<UiResponse>(
      { showToast: 'Could not compute priority score.' },
      200
    );
  }
});
