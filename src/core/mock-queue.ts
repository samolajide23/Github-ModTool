import { BUNDLED_DEMO_SNAPSHOTS } from './demo-snapshots.generated.js';
import {
  DEFAULT_LOW_KARMA_THRESHOLD,
  DEFAULT_SCORE_WEIGHTS,
  type ScoreWeights,
} from './constants.js';
import {
  computeScore,
  countBannedKeywordHits,
  formatScoreBreakdownShort,
  repeatedReportBonus,
} from './scoring.js';
import type { PrioritizedItem, StoredSnapshot } from './queue-types.js';
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
  },
  {
    id: 't1_mock_cmt',
    kind: 'comment',
    title: 'Comment: DM for scam link',
    authorName: 'u/new_account_12',
    permalink: '/r/demo/comments/mock_high/mock_cmt/',
    reportCount: 2,
    text: 'DM me scam spam',
  },
  {
    id: 't3_mock_low',
    kind: 'post',
    title: '[MOCK] Weekly check-in thread',
    authorName: 'u/regular_member',
    permalink: '/r/demo/comments/mock_low/',
    reportCount: 1,
    text: 'How is everyone doing this week?',
  },
];

const toPrioritizedItem = (
  snap: StoredSnapshot,
  breakdown: ReturnType<typeof computeScore>
): PrioritizedItem => ({
  id: snap.id,
  kind: snap.kind,
  title: snap.title,
  authorName: snap.authorName,
  permalink: snap.permalink,
  breakdown,
});

const scoreSnapshotSync = (
  snap: StoredSnapshot,
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): PrioritizedItem => {
  const reportHits = Math.max(snap.reportCount, 2);
  const breakdown = computeScore(
    {
      reportCount: snap.reportCount,
      bannedKeywordHits: countBannedKeywordHits(snap.text, MOCK_KEYWORDS),
      isLowKarmaAuthor:
        snap.authorName.includes('low_karma') || snap.authorName.includes('new_account'),
      repeatedReportBonus: repeatedReportBonus(reportHits, snap.reportCount),
    },
    weights
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
  weights: ScoreWeights = DEFAULT_SCORE_WEIGHTS
): PrioritizedItem[] => {
  const source =
    BUNDLED_DEMO_SNAPSHOTS.length > 0
      ? ([...BUNDLED_DEMO_SNAPSHOTS] as StoredSnapshot[])
      : FALLBACK_SNAPSHOTS;

  const scored = source.map((snap) => scoreSnapshotSync(snap, weights));
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
