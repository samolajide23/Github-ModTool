import { Hono } from 'hono';
import type { MenuItemRequest, UiResponse } from '@devvit/web/shared';
import {
  buildLivePrioritizedQueue,
  prioritizeModQueue,
  scoreQueueItemId,
  toRedditUrl,
} from '../core/queue.js';
import { getOrCreateDashboardPost } from '../core/dashboard-post.js';
import {
  installSettingsHelpForm,
  prioritizedQueueForm,
  readOnlyResultsForm,
} from '../core/form-fields.js';
import { loadQueueConfig } from '../core/config.js';
import { formatScoreBreakdown, formatScoreBreakdownShort } from '../core/scoring.js';

export const menu = new Hono();

menu.post('/configure-settings', async (c) => {
  const request = await c.req.json<MenuItemRequest>();
  const subredditName = request.subreddit?.name ?? 'your subreddit';

  return c.json<UiResponse>(
    {
      showForm: {
        name: 'prioritizedQueue',
        form: installSettingsHelpForm(subredditName),
      },
    },
    200
  );
});

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

menu.post('/view-prioritized-queue', async (c) => {
  await c.req.json<MenuItemRequest>();

  try {
    const items = await buildLivePrioritizedQueue(20);
    console.log(`QueueIQ: showing prioritized queue (${items.length} items)`);

    return c.json<UiResponse>(
      {
        showForm: {
          name: 'prioritizedQueue',
          form: prioritizedQueueForm(items),
        },
      },
      200
    );
  } catch (error) {
    console.error('View prioritized queue failed', error);
    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Could not load the mod queue. Try Refresh prioritized queue.',
          appearance: 'neutral',
        },
      },
      200
    );
  }
});

menu.post('/seed-demo', async (c) => {
  await c.req.json<MenuItemRequest>();

  return c.json<UiResponse>(
    {
      showToast: {
        text: 'Run "npm run seed" in your project terminal, then View prioritized queue.',
        appearance: 'neutral',
      },
    },
    200
  );
});

menu.post('/refresh-queue', async (c) => {
  await c.req.json<MenuItemRequest>();

  try {
    const result = await prioritizeModQueue();
    const top = result.topItem;

    return c.json<UiResponse>(
      {
        showToast: {
          text: top
            ? `Scored ${result.itemCount} items. Top priority: ${top.breakdown.total} pts — ${top.title.slice(0, 60)}`
            : `Mod queue is clear — nothing to prioritize.`,
          appearance: 'success',
        },
      },
      200
    );
  } catch (error) {
    console.error('Queue refresh failed', error);
    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Could not refresh the mod queue. Try again in a moment.',
          appearance: 'neutral',
        },
      },
      200
    );
  }
});

menu.post('/review-top-priority', async (c) => {
  await c.req.json<MenuItemRequest>();

  try {
    const items = await buildLivePrioritizedQueue(1);

    if (items.length === 0) {
      return c.json<UiResponse>(
        {
          showToast: {
            text: 'Mod queue is empty — nothing urgent to review.',
            appearance: 'neutral',
          },
        },
        200
      );
    }

    return c.json<UiResponse>(
      { navigateTo: toRedditUrl(items[0]!.permalink) },
      200
    );
  } catch (error) {
    console.error('Review top priority failed', error);
    return c.json<UiResponse>(
      {
        showToast: {
          text: 'Could not find a top priority item.',
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
      'Higher scores surface first in the prioritized view.',
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
