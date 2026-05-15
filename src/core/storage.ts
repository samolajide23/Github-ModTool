import { context, redis } from '@devvit/web/server';
import type { CommentV2 } from '@devvit/protos/json/devvit/reddit/v2alpha/commentv2.js';
import type { PostV2 } from '@devvit/protos/json/devvit/reddit/v2alpha/postv2.js';
import { T1, T3 } from '@devvit/shared-types/tid.js';
import { REDIS_KEYS } from './constants.js';
import type { QueueItemKind, StoredSnapshot } from './queue-types.js';

export type { StoredSnapshot } from './queue-types.js';

const normalizeId = (id: string, kind: QueueItemKind): string => {
  if (kind === 'comment') {
    return id.startsWith('t1_') ? id : T1(id);
  }
  return id.startsWith('t3_') ? id : T3(id);
};

export const snapshotFromPost = (post: PostV2): StoredSnapshot => {
  const id = normalizeId(post.id, 'post');
  return {
    id,
    kind: 'post',
    title: post.title,
    authorName: post.authorId.replace(/^t2_/, 'u/') || 'unknown',
    permalink: post.permalink,
    reportCount: post.numReports ?? 1,
    text: `${post.title}\n${post.selftext ?? ''}`,
  };
};

export const snapshotFromComment = (comment: CommentV2): StoredSnapshot => {
  const id = normalizeId(comment.id, 'comment');
  const preview = comment.body.replace(/\s+/g, ' ').trim().slice(0, 100);
  return {
    id,
    kind: 'comment',
    title: preview ? `Comment: ${preview}` : 'Comment in mod queue',
    authorName: comment.author || 'unknown',
    permalink: comment.permalink,
    reportCount: comment.numReports ?? 1,
    text: comment.body,
  };
};

const loadTrackedIds = async (subredditId: string): Promise<string[]> => {
  const raw = await redis.get(REDIS_KEYS.trackedIds(subredditId));
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw) as string[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

export const trackSnapshot = async (snapshot: StoredSnapshot): Promise<void> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return;
  }

  try {
    await redis.set(
      REDIS_KEYS.snapshot(subredditId, snapshot.id),
      JSON.stringify(snapshot)
    );

    const ids = await loadTrackedIds(subredditId);
    if (!ids.includes(snapshot.id)) {
      ids.push(snapshot.id);
      await redis.set(REDIS_KEYS.trackedIds(subredditId), JSON.stringify(ids));
    }
  } catch (error) {
    console.error('trackSnapshot failed', error);
  }
};

export const loadTrackedSnapshots = async (): Promise<StoredSnapshot[]> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return [];
  }

  try {
    const ids = await loadTrackedIds(subredditId);
    const snapshots: StoredSnapshot[] = [];

    for (const id of ids) {
      const raw = await redis.get(REDIS_KEYS.snapshot(subredditId, id));
      if (!raw) {
        continue;
      }
      try {
        snapshots.push(JSON.parse(raw) as StoredSnapshot);
      } catch {
        /* skip corrupt entry */
      }
    }

    return snapshots;
  } catch (error) {
    console.error('loadTrackedSnapshots failed', error);
    return [];
  }
};
