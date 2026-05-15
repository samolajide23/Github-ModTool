import { context, redis, reddit } from '@devvit/web/server';
import { FALLBACK_DASHBOARD_POST_ID } from './dashboard-post-id.generated.js';
import { REDIS_KEYS } from './constants.js';

export const DASHBOARD_TITLE = 'QueueIQ — Prioritized mod queue';

export type DashboardPostRef = {
  id: string;
  url: string;
};

export const getDashboardPostUrl = (postId: string, subredditName: string): string => {
  const bareId = postId.replace(/^t3_/, '');
  return `https://www.reddit.com/r/${subredditName}/comments/${bareId}/`;
};

const TEXT_FALLBACK = {
  text: 'QueueIQ prioritized mod queue dashboard. Open in the Reddit app for the full UI.',
};

/** App account — used on install/upgrade triggers. */
export const createDashboardPostAsApp = async () =>
  reddit.submitCustomPost({
    title: DASHBOARD_TITLE,
    entry: 'default',
    textFallback: TEXT_FALLBACK,
  });

/** Moderator account — used from mod menu (requires asUser permission). */
export const createDashboardPostAsUser = async () =>
  reddit.submitCustomPost({
    title: DASHBOARD_TITLE,
    entry: 'default',
    runAs: 'USER',
    userGeneratedContent: {
      text: 'QueueIQ moderator dashboard for prioritized mod queue review.',
    },
    textFallback: TEXT_FALLBACK,
  });

const resolvePostRef = async (postId: string): Promise<DashboardPostRef> => {
  const subredditName = context.subredditName;
  if (!subredditName) {
    throw new Error('Missing subreddit context');
  }

  try {
    const post = await reddit.getPostById(postId);
    return {
      id: post.id,
      url: post.url ?? getDashboardPostUrl(post.id, subredditName),
    };
  } catch (error) {
    console.error(`getPostById failed for dashboard ${postId}, using direct URL`, error);
    return {
      id: postId.startsWith('t3_') ? postId : `t3_${postId}`,
      url: getDashboardPostUrl(postId, subredditName),
    };
  }
};

export const getOrCreateDashboardPost = async (options?: {
  createAsUser?: boolean;
}): Promise<DashboardPostRef> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    throw new Error('Missing subreddit context');
  }

  const storedId = await redis
    .get(REDIS_KEYS.dashboardPost(subredditId))
    .catch(() => undefined);

  if (storedId) {
    return resolvePostRef(storedId);
  }

  if (FALLBACK_DASHBOARD_POST_ID) {
    console.log(`QueueIQ: using fallback dashboard post ${FALLBACK_DASHBOARD_POST_ID}`);
    return resolvePostRef(FALLBACK_DASHBOARD_POST_ID);
  }

  let post;
  try {
    post = options?.createAsUser
      ? await createDashboardPostAsUser()
      : await createDashboardPostAsApp();
  } catch (createError) {
    if (options?.createAsUser) {
      console.error('createDashboardPostAsUser failed, trying APP account', createError);
      post = await createDashboardPostAsApp();
    } else {
      throw createError;
    }
  }
  await redis
    .set(REDIS_KEYS.dashboardPost(subredditId), post.id)
    .catch((error) => console.error('Could not cache dashboard post id', error));

  return {
    id: post.id,
    url: post.url ?? getDashboardPostUrl(post.id, context.subredditName ?? 'unknown'),
  };
};
