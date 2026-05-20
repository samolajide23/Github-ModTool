import { reddit } from '@devvit/web/server';

export type AuthorSignals = {
  isLowKarma: boolean;
  isYoung: boolean;
};

const normalizeUsername = (authorName: string | undefined): string | undefined => {
  const username = authorName?.replace(/^u\//, '');
  if (!username || username === '[deleted]' || username === 'unknown') {
    return undefined;
  }
  return username;
};

/** One Reddit user lookup per author per request (shared in-memory cache). */
export const resolveAuthorSignals = async (
  authorName: string | undefined,
  lowKarmaThreshold: number,
  youngAccountMaxDays: number,
  cache: Map<string, AuthorSignals>
): Promise<AuthorSignals> => {
  const username = normalizeUsername(authorName);
  if (!username) {
    return { isLowKarma: false, isYoung: false };
  }

  const cached = cache.get(username);
  if (cached) {
    return cached;
  }

  let signals: AuthorSignals = { isLowKarma: false, isYoung: false };

  try {
    const user = await reddit.getUserByUsername(username);
    if (!user) {
      signals = { isLowKarma: true, isYoung: true };
    } else {
      const totalKarma = user.linkKarma + user.commentKarma;
      const isLowKarma = totalKarma < lowKarmaThreshold;
      let isYoung = false;
      if (youngAccountMaxDays > 0 && user.createdAt) {
        const ageMs = Date.now() - user.createdAt.getTime();
        isYoung = ageMs < youngAccountMaxDays * 24 * 60 * 60 * 1000;
      } else if (youngAccountMaxDays > 0) {
        isYoung = true;
      }
      signals = { isLowKarma, isYoung };
    }
  } catch {
    signals = { isLowKarma: false, isYoung: false };
  }

  cache.set(username, signals);
  return signals;
};

/** @deprecated Use resolveAuthorSignals with a request-scoped cache. */
export const isYoungAccount = async (
  authorName: string | undefined,
  maxDays: number
): Promise<boolean> => {
  if (maxDays <= 0) {
    return false;
  }
  const cache = new Map<string, AuthorSignals>();
  return (await resolveAuthorSignals(authorName, 0, maxDays, cache)).isYoung;
};
