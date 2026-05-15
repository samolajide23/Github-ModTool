/** Default score weights — mods can override per subreddit (dashboard or Redis). */
export type ScoreWeights = {
  reports: number;
  bannedKeyword: number;
  lowKarmaAuthor: number;
  repeatedReporter: number;
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeights = {
  reports: 3,
  bannedKeyword: 5,
  lowKarmaAuthor: 4,
  repeatedReporter: 2,
};

/** @deprecated Use DEFAULT_SCORE_WEIGHTS or loaded config weights */
export const SCORE_WEIGHTS = DEFAULT_SCORE_WEIGHTS;

export const DEFAULT_LOW_KARMA_THRESHOLD = 100;

export const REDIS_KEYS = {
  priorityQueue: (subredditId: string) => `queueiq:priority:${subredditId}`,
  itemMeta: (subredditId: string, thingId: string) =>
    `queueiq:meta:${subredditId}:${thingId}`,
  reportHits: (thingId: string) => `queueiq:report-hits:${thingId}`,
  lastRefresh: (subredditId: string) => `queueiq:last-refresh:${subredditId}`,
  trackedIds: (subredditId: string) => `queueiq:tracked-ids:${subredditId}`,
  snapshot: (subredditId: string, thingId: string) =>
    `queueiq:snapshot:${subredditId}:${thingId}`,
  dashboardPost: (subredditId: string) => `queueiq:dashboard-post:${subredditId}`,
} as const;

export const WEIGHT_LIMITS = { min: 0, max: 50 } as const;
