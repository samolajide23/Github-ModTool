import { BUNDLED_DEMO_SNAPSHOTS } from './demo-snapshots.generated.js';
import { DEFAULT_LOW_KARMA_THRESHOLD, DEFAULT_SCORE_WEIGHTS } from './constants.js';
import type { QueueConfig } from './config.js';
import { flairBonusFromRules } from './flair-rules.js';
import {
  computeScore,
  countBannedKeywordHits,
  formatScoreBreakdownShort,
  queueAgeHoursFromCreatedAt,
  repeatedReportBonus,
} from './scoring.js';
import type { PrioritizedItem, StoredSnapshot } from './queue-types.js';
import { toPrioritizedItem } from './prioritized-item.js';
import { toRedditUrl } from './urls.js';

const MOCK_KEYWORDS = ['spam', 'scam', 'phishing', 'giveaway', 'free money'];

const FALLBACK_SNAPSHOTS: StoredSnapshot[] = [
  {
    id: 't3_mock_high',
    kind: 'post',
    title: '[MOCK] Crypto scam — free money giveaway',
    authorName: 'u/low_karma_user',
    permalink: '/r/demo/comments/mock_high/',
    reportCount: 3,
    text: 'scam phishing giveaway free money click here',
    locked: true,
    ignoringReports: false,
    createdAtMs: Date.now() - 6 * 60 * 60 * 1000,
    modReportCount: 1,
    flairText: 'Spam',
  },
  {
    id: 't1_mock_cmt',
    kind: 'comment',
    title: 'Comment: DM for scam link',
    authorName: 'u/new_account_12',
    permalink: '/r/demo/comments/mock_high/mock_cmt/',
    reportCount: 2,
    text: 'DM me scam spam',
    ignoringReports: true,
    createdAtMs: Date.now() - 2 * 60 * 60 * 1000,
  },
  {
    id: 't3_mock_low',
    kind: 'post',
    title: '[MOCK] Weekly check-in thread',
    authorName: 'u/regular_member',
    permalink: '/r/demo/comments/mock_low/',
    reportCount: 1,
    text: 'How is everyone doing this week?',
    createdAtMs: Date.now() - 30 * 60 * 1000,
  },
];

const scoreSnapshotSync = (snap: StoredSnapshot, config: QueueConfig): PrioritizedItem => {
  const reportHits = Math.max(snap.reportCount, 2);
  const breakdown = computeScore(
    {
      reportCount: snap.reportCount,
      bannedKeywordHits: countBannedKeywordHits(snap.text, config.bannedKeywords),
      isLowKarmaAuthor:
        snap.authorName.includes('low_karma') || snap.authorName.includes('new_account'),
      repeatedReportBonus: repeatedReportBonus(reportHits, snap.reportCount),
      queueAgeHours: queueAgeHoursFromCreatedAt(snap.createdAtMs),
      isYoungAccount: snap.authorName.includes('new_account'),
      modReportCount: snap.modReportCount ?? 0,
      flairBonus: flairBonusFromRules(snap.flairText, config.flairRules),
    },
    config.weights
  );

  return toPrioritizedItem(snap, breakdown);
};

const formatItemBlock = (item: PrioritizedItem, index: number): string => {
  const kind = item.kind === 'post' ? 'Post' : 'Comment';
  const path = toRedditUrl(item.permalink).replace('https://www.reddit.com', '');
  return [
    `${index + 1}. ${item.breakdown.total} pts · ${kind}`,
    item.title,
    item.authorName,
    formatScoreBreakdownShort(item.breakdown),
    path,
  ].join('\n');
};

/** Offline prioritized queue — no Reddit API, Redis, or custom posts. */
export const buildMockPrioritizedQueue = (
  limit?: number,
  config?: QueueConfig
): PrioritizedItem[] => {
  const cfg: QueueConfig = config ?? {
    bannedKeywords: MOCK_KEYWORDS,
    lowKarmaThreshold: DEFAULT_LOW_KARMA_THRESHOLD,
    youngAccountMaxDays: 7,
    flairRulesRaw: 'Spam:10',
    flairRules: new Map([['spam', 10]]),
    weights: { ...DEFAULT_SCORE_WEIGHTS },
    autoRemoveAboveScore: 0,
    autoRemoveMinReports: 0,
  };

  const source =
    BUNDLED_DEMO_SNAPSHOTS.length > 0
      ? ([...BUNDLED_DEMO_SNAPSHOTS] as StoredSnapshot[])
      : FALLBACK_SNAPSHOTS;

  if (source.length === 0) {
    return [];
  }

  const targetCount = limit ?? source.length;
  const pool: StoredSnapshot[] = [];

  for (let i = 0; i < targetCount; i += 1) {
    const base = source[i % source.length]!;
    pool.push({
      ...base,
      id: i === 0 ? base.id : `${base.id}__mock_${i}`,
      title: i === 0 ? base.title : `${base.title} (#${i + 1})`,
      reportCount: base.reportCount + (i % 4),
      createdAtMs: (base.createdAtMs ?? Date.now()) - i * 15 * 60 * 1000,
    });
  }

  const scored = pool.map((snap) => scoreSnapshotSync(snap, cfg));
  scored.sort((a, b) => b.breakdown.total - a.breakdown.total);
  return limit ? scored.slice(0, limit) : scored;
};

export const formatMockQueuePreview = (items: PrioritizedItem[]): string => {
  const header = [
    '🧪 MOCK PREVIEW — no Reddit API or custom post required',
    `Keywords: ${MOCK_KEYWORDS.join(', ')} · low karma threshold: ${DEFAULT_LOW_KARMA_THRESHOLD}`,
  ].join('\n');

  if (items.length === 0) {
    return `${header}\n\nMod queue is empty.`;
  }

  return `${header}\n\n${items.map(formatItemBlock).join('\n\n────────────\n\n')}`;
};
