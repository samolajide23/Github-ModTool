import { reddit } from '@devvit/web/server';

export const isYoungAccount = async (
  authorName: string | undefined,
  maxDays: number
): Promise<boolean> => {
  const username = authorName?.replace(/^u\//, '');
  if (!username || username === '[deleted]' || username === 'unknown' || maxDays <= 0) {
    return false;
  }

  try {
    const user = await reddit.getUserByUsername(username);
    if (!user?.createdAt) {
      return true;
    }
    const ageMs = Date.now() - user.createdAt.getTime();
    return ageMs < maxDays * 24 * 60 * 60 * 1000;
  } catch {
    return false;
  }
};
