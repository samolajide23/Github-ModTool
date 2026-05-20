import type { QueueItemDto } from '../shared/api.js';
import { formatScoreBreakdownShort } from './scoring.js';
import type { PrioritizedItem } from './queue-types.js';
import { prioritizedItemToDtoFields } from './prioritized-item.js';
import { toRedditUrl } from './urls.js';

export const toQueueItemDto = (item: PrioritizedItem): QueueItemDto => {
  const fields = prioritizedItemToDtoFields(item);
  const dto: QueueItemDto = {
    id: fields.id,
    kind: fields.kind,
    title: fields.title,
    authorName: fields.authorName,
    permalink: fields.permalink,
    locked: fields.locked,
    ignoringReports: fields.ignoringReports,
    url: toRedditUrl(fields.permalink),
    breakdownShort: formatScoreBreakdownShort(fields.breakdown),
    breakdown: { ...fields.breakdown },
  };
  if (fields.flairText !== undefined) {
    dto.flairText = fields.flairText;
  }
  return dto;
};
