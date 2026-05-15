import type { QueueItemDto } from '../shared/api.js';
import { formatScoreBreakdownShort } from './scoring.js';
import type { PrioritizedItem } from './queue-types.js';
import { toRedditUrl } from './urls.js';

export const toQueueItemDto = (item: PrioritizedItem): QueueItemDto => ({
  id: item.id,
  kind: item.kind,
  title: item.title,
  authorName: item.authorName,
  permalink: item.permalink,
  url: toRedditUrl(item.permalink),
  breakdownShort: formatScoreBreakdownShort(item.breakdown),
  breakdown: {
    total: item.breakdown.total,
    reportCount: item.breakdown.reportCount,
    bannedKeywordHits: item.breakdown.bannedKeywordHits,
    isLowKarmaAuthor: item.breakdown.isLowKarmaAuthor,
    repeatedReportBonus: item.breakdown.repeatedReportBonus,
    reportsPoints: item.breakdown.reportsPoints,
    keywordPoints: item.breakdown.keywordPoints,
    lowKarmaPoints: item.breakdown.lowKarmaPoints,
    repeatedPoints: item.breakdown.repeatedPoints,
  },
});
