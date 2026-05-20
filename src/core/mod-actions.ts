import { context, reddit } from '@devvit/web/server';
import type { Comment, Post } from '@devvit/web/server';
import { isT1, isT3 } from '@devvit/shared-types/tid.js';
import type { ModActionKind, ModActionOptions } from '../shared/api.js';
import { appendAuditLog } from './audit-log.js';

const VALID_ACTIONS: ReadonlySet<ModActionKind> = new Set([
  'approve',
  'remove',
  'spam',
  'lock',
  'unlock',
  'ignore-reports',
  'unignore-reports',
  'ban-user',
]);

export const isModActionKind = (value: string): value is ModActionKind =>
  VALID_ACTIONS.has(value as ModActionKind);

export const isQueueThingId = (id: string): boolean => isT1(id) || isT3(id);

const fetchThing = async (id: string): Promise<Post | Comment> => {
  if (isT3(id)) {
    return reddit.getPostById(id);
  }
  if (isT1(id)) {
    return reddit.getCommentById(id);
  }
  throw new Error('Invalid queue item id.');
};

const parseUsername = (authorName: string): string =>
  authorName.replace(/^u\//, '').trim();

export const performModAction = async (
  id: string,
  action: ModActionKind,
  options: ModActionOptions = {}
): Promise<void> => {
  if (!isQueueThingId(id)) {
    throw new Error('Invalid queue item id.');
  }

  const thingId = id as `t1_${string}` | `t3_${string}`;
  const subredditName = context.subredditName;
  if (!subredditName) {
    throw new Error('Missing subreddit context.');
  }

  switch (action) {
    case 'approve':
      await reddit.approve(thingId);
      break;
    case 'remove': {
      const thing = await fetchThing(id);
      const rid = options.removalReasonId?.trim() ?? '';
      const mn = options.modNote?.trim();
      if (rid && mn) {
        await thing.addRemovalNote({ reasonId: rid, modNote: mn.slice(0, 100) });
      } else if (rid) {
        await thing.addRemovalNote({ reasonId: rid });
      }
      await reddit.remove(thingId, false);
      break;
    }
    case 'spam': {
      const thing = await fetchThing(id);
      const rid = options.removalReasonId?.trim() ?? '';
      const mn = options.modNote?.trim();
      if (rid && mn) {
        await thing.addRemovalNote({ reasonId: rid, modNote: mn.slice(0, 100) });
      } else if (rid) {
        await thing.addRemovalNote({ reasonId: rid });
      }
      await reddit.remove(thingId, true);
      break;
    }
    case 'lock':
    case 'unlock':
    case 'ignore-reports':
    case 'unignore-reports': {
      const thing = await fetchThing(id);
      if (action === 'lock') {
        await thing.lock();
      } else if (action === 'unlock') {
        await thing.unlock();
      } else if (action === 'ignore-reports') {
        await thing.ignoreReports();
      } else {
        await thing.unignoreReports();
      }
      break;
    }
    case 'ban-user': {
      const thing = await fetchThing(id);
      const username = options.banUsername ?? parseUsername(thing.authorName);
      if (!username || username === '[deleted]') {
        throw new Error('Cannot ban a deleted or unknown author.');
      }
      const banArgs: {
        username: string;
        subredditName: string;
        context: string;
        note?: string;
        reason?: string;
        duration?: number;
      } = {
        username,
        subredditName,
        context: id,
      };
      if (options.note !== undefined) {
        banArgs.note = options.note;
        banArgs.reason = options.note;
      }
      if (options.banDurationDays !== undefined && options.banDurationDays > 0) {
        banArgs.duration = options.banDurationDays;
      }
      await reddit.banUser(banArgs);
      break;
    }
    default: {
      const _exhaustive: never = action;
      throw new Error(`Unsupported action: ${_exhaustive}`);
    }
  }

  const detail = [
    options.note && `note: ${options.note}`,
    options.modNote && `mod note: ${options.modNote}`,
    options.banDurationDays && options.banDurationDays > 0 && `duration: ${options.banDurationDays}d`,
    action === 'ban-user' && options.banUsername && `user: ${options.banUsername}`,
  ]
    .filter(Boolean)
    .join('; ');

  await appendAuditLog(action, id, detail || undefined);
};
