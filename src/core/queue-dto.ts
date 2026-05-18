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
  locked: item.locked,
  ignoringReports: item.ignoringReports,
  flairText: item.flairText,
  url: toRedditUrl(item.permalink),
  breakdownShort: formatScoreBreakdownShort(item.breakdown),
  breakdown: { ...item.breakdown },
});
