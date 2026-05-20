import { context, redis, reddit } from '@devvit/web/server';
import type { Comment, Post } from '@devvit/web/server';
import { isT1, isT3 } from '@devvit/shared-types/tid.js';
import { loadQueueConfig, type QueueConfig } from './config.js';
import { BUNDLED_DEMO_SNAPSHOTS } from './demo-snapshots.generated.js';
import { REDIS_KEYS } from './constants.js';
import { resolveAuthorSignals, type AuthorSignals } from './author-signals.js';
import { mapPool } from './map-pool.js';
import { readQueueCache, writeQueueCache } from './queue-cache.js';
import { QUEUE_SCORE_CONCURRENCY } from './constants.js';
import { flairBonusFromRules } from './flair-rules.js';
import {
  computeScore,
  countBannedKeywordHits,
  formatScoreBreakdown,
  formatScoreBreakdownShort,
  queueAgeHoursFromCreatedAt,
  repeatedReportBonus,
  type ScoreBreakdown,
} from './scoring.js';
import { applyAutoRemoveByScore } from './auto-remove-by-score.js';
import {
  loadTrackedSnapshots,
  trackSnapshot,
} from './storage.js';
import type { PrioritizedItem, QueueItemKind, StoredSnapshot } from './queue-types.js';
import { toRedditUrl } from './urls.js';

export type { QueueItemKind, PrioritizedItem, StoredSnapshot } from './queue-types.js';
export { toRedditUrl } from './urls.js';

export type PrioritizeResult = {
  subredditName: string;
  itemCount: number;
  topItem: PrioritizedItem | undefined;
  refreshedAt: string;
};

const getReportCount = (thing: Post | Comment): number =>
  'numberOfReports' in thing ? thing.numberOfReports : thing.numReports;

const getSearchableText = (thing: Post | Comment): string => {
  if ('title' in thing) {
    return `${thing.title}\n${thing.body ?? ''}`;
  }

  return thing.body;
};

const getDisplayTitle = (thing: Post | Comment): string => {
  if ('title' in thing) {
    const bodyPreview = thing.body?.slice(0, 80);
    return bodyPreview ? `${thing.title} — ${bodyPreview}` : thing.title;
  }

  const preview = thing.body.replace(/\s+/g, ' ').trim().slice(0, 100);
  return preview ? `Comment: ${preview}` : 'Comment in mod queue';
};

const getReportHits = async (thingId: string, reportCount: number): Promise<number> => {
  try {
    const stored = await redis.get(REDIS_KEYS.reportHits(thingId));
    const parsed = stored ? Number.parseInt(stored, 10) : Number.NaN;
    return Number.isFinite(parsed) ? Math.max(parsed, reportCount) : reportCount;
  } catch {
    return reportCount;
  }
};

const buildScoreInputFromSnapshot = async (
  snap: StoredSnapshot,
  config: QueueConfig,
  authorCache: Map<string, AuthorSignals>
) => {
  const reportHits = await getReportHits(snap.id, snap.reportCount);
  const { isLowKarma, isYoung } = await resolveAuthorSignals(
    snap.authorName,
    config.lowKarmaThreshold,
    config.youngAccountMaxDays,
    authorCache
  );
  const flairBonus = flairBonusFromRules(snap.flairText, config.flairRules);

  return {
    reportCount: snap.reportCount,
    bannedKeywordHits: countBannedKeywordHits(snap.text, config.bannedKeywords),
    isLowKarmaAuthor: isLowKarma,
    repeatedReportBonus: repeatedReportBonus(reportHits, snap.reportCount),
    queueAgeHours: queueAgeHoursFromCreatedAt(snap.createdAtMs),
    isYoungAccount: isYoung,
    modReportCount: snap.modReportCount ?? 0,
    flairBonus,
  };
};

const scoreSnapshot = async (
  snap: StoredSnapshot,
  config: QueueConfig,
  authorCache: Map<string, AuthorSignals>
): Promise<ScoreBreakdown> => {
  const input = await buildScoreInputFromSnapshot(snap, config, authorCache);
  return computeScore(input, config.weights);
};

export const scoreQueueItemId = async (
  targetId: string,
  config?: QueueConfig
): Promise<ScoreBreakdown | undefined> => {
  const cfg = config ?? (await loadQueueConfig()).config;

  try {
    if (isT3(targetId)) {
      return await scoreQueueThing(await reddit.getPostById(targetId), cfg);
    }
    if (isT1(targetId)) {
      return await scoreQueueThing(await reddit.getCommentById(targetId), cfg);
    }
  } catch (error) {
    console.error(`scoreQueueItemId API failed for ${targetId}`, error);
  }

  const bundled = getBundledSnapshots().find((snap) => snap.id === targetId);
  if (bundled) {
    return scoreSnapshot(bundled, cfg, new Map());
  }

  return undefined;
};

const getFlairFromThing = (thing: Post | Comment): string | undefined => {
  if ('title' in thing) {
    return thing.flair?.text ?? thing.flairText;
  }
  return thing.authorFlair?.text;
};

export const scoreQueueThing = async (
  thing: Post | Comment,
  config: QueueConfig
): Promise<ScoreBreakdown> => {
  const reportCount = getReportCount(thing);
  const reportHits = await getReportHits(thing.id, reportCount);
  const bannedKeywordHits = countBannedKeywordHits(
    getSearchableText(thing),
    config.bannedKeywords
  );
  const authorCache = new Map<string, AuthorSignals>();
  const { isLowKarma, isYoung } = await resolveAuthorSignals(
    thing.authorName,
    config.lowKarmaThreshold,
    config.youngAccountMaxDays,
    authorCache
  );
  const flairText = getFlairFromThing(thing);
  const modReportCount = thing.modReportReasons?.length ?? 0;
  const createdAtMs = thing.createdAt?.getTime();

  return computeScore(
    {
      reportCount,
      bannedKeywordHits,
      isLowKarmaAuthor: isLowKarma,
      repeatedReportBonus: repeatedReportBonus(reportHits, reportCount),
      queueAgeHours: queueAgeHoursFromCreatedAt(createdAtMs),
      isYoungAccount: isYoung,
      modReportCount,
      flairBonus: flairBonusFromRules(flairText, config.flairRules),
    },
    config.weights
  );
};

export const toPrioritizedItem = (
  snap: StoredSnapshot,
  breakdown: ScoreBreakdown
): PrioritizedItem => ({
  id: snap.id,
  kind: snap.kind,
  title: snap.title,
  authorName: snap.authorName,
  permalink: snap.permalink,
  locked: snap.locked ?? false,
  ignoringReports: snap.ignoringReports ?? false,
  flairText: snap.flairText,
  breakdown,
});

const thingToSnapshot = (thing: Post | Comment): StoredSnapshot => {
  const flairText = getFlairFromThing(thing);

  return {
    id: thing.id,
    kind: isT1(thing.id) ? 'comment' : 'post',
    title: getDisplayTitle(thing),
    authorName: thing.authorName,
    permalink: thing.permalink,
    reportCount: getReportCount(thing),
    text: getSearchableText(thing),
    locked: thing.locked,
    ignoringReports: thing.ignoringReports,
    createdAtMs: thing.createdAt?.getTime(),
    flairText,
    modReportCount: thing.modReportReasons?.length ?? 0,
  };
};

const dedupeSnapshots = (snapshots: readonly StoredSnapshot[]): StoredSnapshot[] => {
  const seen = new Set<string>();
  const unique: StoredSnapshot[] = [];

  for (const snap of snapshots) {
    if (seen.has(snap.id)) {
      continue;
    }
    seen.add(snap.id);
    unique.push(snap);
  }

  return unique;
};

const getBundledSnapshots = (): StoredSnapshot[] =>
  dedupeSnapshots(BUNDLED_DEMO_SNAPSHOTS as readonly StoredSnapshot[]);

const fetchByIds = async (ids: readonly string[]): Promise<StoredSnapshot[]> => {
  const snapshots: StoredSnapshot[] = [];

  for (const id of ids) {
    try {
      if (isT3(id)) {
        const post = await reddit.getPostById(id);
        snapshots.push(thingToSnapshot(post));
      } else if (isT1(id)) {
        const comment = await reddit.getCommentById(id);
        snapshots.push(thingToSnapshot(comment));
      }
    } catch (error) {
      console.error(`getById failed for ${id}`, error);
    }
  }

  return snapshots;
};

const fetchFromModQueueApi = async (): Promise<StoredSnapshot[]> => {
  const subredditName = context.subredditName;

  if (!subredditName) {
    throw new Error('Missing context.subredditName');
  }

  const queueOpts = { type: 'all' as const, subreddit: subredditName };

  try {
    const listing = await reddit.getModQueue(queueOpts);
    const things = await listing.all();
    return things.map(thingToSnapshot);
  } catch (modQueueError) {
    console.error('reddit.getModQueue failed, trying getReports', modQueueError);
    const listing = await reddit.getReports(queueOpts);
    const things = await listing.all();
    return things.map(thingToSnapshot);
  }
};

const fetchQueueSnapshots = async (): Promise<StoredSnapshot[]> => {
  console.log(
    `QueueIQ context: subreddit=${context.subredditName ?? '?'} id=${context.subredditId ?? '?'}`
  );

  try {
    const fromApi = await fetchFromModQueueApi();
    if (fromApi.length > 0) {
      console.log(`QueueIQ: loaded ${fromApi.length} item(s) from mod queue API`);
      void Promise.all(fromApi.map((snap) => trackSnapshot(snap))).catch((error) => {
        console.error('trackSnapshot batch failed', error);
      });
      return fromApi;
    }
  } catch (apiError) {
    console.error('Mod queue API unavailable in playtest', apiError);
  }

  const tracked = await loadTrackedSnapshots();
  if (tracked.length > 0) {
    console.log(`QueueIQ: loaded ${tracked.length} item(s) from Redis cache`);
    return tracked;
  }

  const bundled = getBundledSnapshots();
  const fromIds = await fetchByIds(bundled.length > 0 ? bundled.map((s) => s.id) : []);
  if (fromIds.length > 0) {
    console.log(`QueueIQ: loaded ${fromIds.length} item(s) via getPostById fallback`);
    void Promise.all(fromIds.map((snap) => trackSnapshot(snap))).catch((error) => {
      console.error('trackSnapshot batch failed', error);
    });
    return fromIds;
  }

  if (BUNDLED_DEMO_SNAPSHOTS.length > 0) {
    console.log(
      `QueueIQ: using ${BUNDLED_DEMO_SNAPSHOTS.length} bundled snapshot(s) (playtest API offline — run npm run sync-demo)`
    );
    return [...BUNDLED_DEMO_SNAPSHOTS];
  }

  return [];
};

/** Score mod-queue items (API → Redis cache → per-id fallback). */
export const buildLivePrioritizedQueue = async (
  limit?: number,
  configOverride?: Partial<QueueConfig>
): Promise<PrioritizedItem[]> => {
  const baseConfig = (await loadQueueConfig()).config;
  const config = { ...baseConfig, ...configOverride };
  const snapshots = await fetchQueueSnapshots();
  const authorCache = new Map<string, AuthorSignals>();

  const scored = await mapPool(snapshots, QUEUE_SCORE_CONCURRENCY, async (snap) => {
    const breakdown = await scoreSnapshot(snap, config, authorCache);
    return toPrioritizedItem(snap, breakdown);
  });

  scored.sort((a, b) => b.breakdown.total - a.breakdown.total);

  return limit ? scored.slice(0, limit) : scored;
};

const cachePrioritizedQueue = async (scored: PrioritizedItem[]): Promise<void> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return;
  }

  try {
    const queueKey = REDIS_KEYS.priorityQueue(subredditId);
    await redis.del(queueKey);

    for (const item of scored) {
      await redis.set(
        REDIS_KEYS.itemMeta(subredditId, item.id),
        JSON.stringify({
          breakdown: item.breakdown,
          title: item.title,
          authorName: item.authorName,
          permalink: item.permalink,
          kind: item.kind,
        })
      );
    }

    if (scored.length > 0) {
      await redis.zAdd(
        queueKey,
        ...scored.map((item) => ({
          member: item.id,
          score: item.breakdown.total,
        }))
      );
    }

    await redis.set(REDIS_KEYS.lastRefresh(subredditId), new Date().toISOString());
    await writeQueueCache(scored);
  } catch (error) {
    console.error('Redis cache skipped', error);
  }
};

/** Fast path: return cached prioritized items when scheduler/refresh already ran. */
export const loadCachedPrioritizedQueue = async (): Promise<{
  items: PrioritizedItem[];
  totalInQueue: number;
  refreshedAt: string;
} | null> => {
  const cached = await readQueueCache();
  if (!cached) {
    return null;
  }
  return {
    items: cached.items,
    totalInQueue: cached.totalInQueue,
    refreshedAt: cached.refreshedAt,
  };
};

export const prioritizeModQueue = async (): Promise<PrioritizeResult> => {
  const { config } = await loadQueueConfig();
  let scored = await buildLivePrioritizedQueue(undefined, config);
  scored = await applyAutoRemoveByScore(scored, config);
  await cachePrioritizedQueue(scored);

  const subredditName =
    context.subredditName ?? scored[0]?.permalink.match(/\/r\/([^/]+)/)?.[1] ?? 'unknown';

  return {
    subredditName,
    itemCount: scored.length,
    topItem: scored[0],
    refreshedAt: new Date().toISOString(),
  };
};

export const getPrioritizedQueue = async (
  limit = 25
): Promise<PrioritizedItem[]> => buildLivePrioritizedQueue(limit);

export const truncateText = (text: string, maxLength: number): string =>
  text.length <= maxLength ? text : `${text.slice(0, maxLength - 1)}…`;

export const shortenPermalink = (permalink: string): string => {
  const url = toRedditUrl(permalink);

  try {
    return new URL(url).pathname;
  } catch {
    return truncateText(permalink, 64);
  }
};

export const formatQueueItemHelp = (item: PrioritizedItem): string =>
  [
    truncateText(item.title, 100),
    item.authorName,
    formatScoreBreakdownShort(item.breakdown),
    shortenPermalink(item.permalink),
  ].join('\n');

export const formatQueueSummary = (items: PrioritizedItem[]): string => {
  if (items.length === 0) {
    return 'Mod queue is empty in playtest.\n\nIn your terminal run:\n  npm run seed\n  npm run sync-demo\nThen open QueueIQ from the mod menu again.';
  }

  return items
    .map((item, index) => {
      const kind = item.kind === 'post' ? 'Post' : 'Comment';
      return [
        `${index + 1}. ${item.breakdown.total} pts · ${kind}`,
        formatQueueItemHelp(item),
      ].join('\n');
    })
    .join('\n\n────────────\n\n');
};

export const recordReportEvent = async (thingId: string): Promise<void> => {
  try {
    await redis.incrBy(REDIS_KEYS.reportHits(thingId), 1);
  } catch (error) {
    console.error(`Could not record report hit for ${thingId}`, error);
  }
};
