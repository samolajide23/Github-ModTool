import { context, reddit } from '@devvit/web/server';

/** Thrown when the current user may not access mod-only QueueIQ APIs. */
export class ModGuardError extends Error {
  readonly status: number;

  constructor(message: string, status = 403) {
    super(message);
    this.name = 'ModGuardError';
    this.status = status;
  }
}

type RedditUser = NonNullable<Awaited<ReturnType<typeof reddit.getCurrentUser>>>;

const normalizeSubredditKey = (name: string) => name.replace(/^r\//i, '').trim().toLowerCase();

const normalizeUsername = (name: string) => name.replace(/^u\//i, '').trim();

const isModeratorByUsername = async (
  username: string,
  subredditName: string
): Promise<boolean> => {
  const bare = normalizeUsername(username);
  if (!bare) {
    return false;
  }

  try {
    const mods = await reddit
      .getModerators({ subredditName, username: bare, limit: 10, pageSize: 10 })
      .all();
    return mods.some((m) => m.username.toLowerCase() === bare.toLowerCase());
  } catch (error) {
    console.error(`QueueIQ: mod lookup by username failed for u/${bare}`, error);
    return false;
  }
};

const userModeratesSubreddit = async (user: RedditUser, subredditName: string): Promise<boolean> => {
  if (user.isAdmin) {
    return true;
  }

  const key = normalizeSubredditKey(subredditName);

  for (const [sub, perms] of user.modPermissions) {
    if (normalizeSubredditKey(sub) === key && perms.length > 0) {
      return true;
    }
  }

  try {
    const asyncPerms = await user.getModPermissionsForSubreddit(subredditName);
    if (asyncPerms.length > 0) {
      return true;
    }
  } catch (error) {
    console.error('QueueIQ: getModPermissionsForSubreddit failed', error);
  }

  return false;
};

const resolveUsername = async (): Promise<string | undefined> => {
  const fromContext = context.username ? normalizeUsername(context.username) : '';
  if (fromContext) {
    return fromContext;
  }

  try {
    const current = await reddit.getCurrentUser();
    if (current?.username) {
      return normalizeUsername(current.username);
    }
  } catch (error) {
    console.error('QueueIQ: getCurrentUser failed', error);
  }

  if (context.userId) {
    try {
      const byId = await reddit.getUserById(context.userId);
      if (byId?.username) {
        return normalizeUsername(byId.username);
      }
    } catch (error) {
      console.error('QueueIQ: getUserById failed', error);
    }
  }

  return undefined;
};

/**
 * Ensures the request has a logged-in user who is a moderator of the current subreddit.
 * Never throws raw Reddit API errors — only ModGuardError with stable messages.
 */
export const requireSubredditModerator = async (): Promise<void> => {
  const subredditName = context.subredditName;
  if (!subredditName) {
    throw new ModGuardError('QueueIQ must be used inside a subreddit.', 403);
  }

  const username = await resolveUsername();
  if (!username) {
    throw new ModGuardError('Sign in to Reddit to use QueueIQ.', 401);
  }

  if (await isModeratorByUsername(username, subredditName)) {
    return;
  }

  try {
    const user = await reddit.getUserByUsername(username);
    if (user && (await userModeratesSubreddit(user, subredditName))) {
      return;
    }
  } catch (error) {
    console.error(`QueueIQ: mod check via user profile failed for u/${username}`, error);
  }

  throw new ModGuardError('Only moderators of this community can use QueueIQ.', 403);
};
