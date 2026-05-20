import type { QueueItemDto } from './api.js';

export type QueueSortMode = 'score' | 'oldest' | 'newest' | 'most-reported';

export const DEFAULT_QUEUE_SORT: QueueSortMode = 'score';

export const QUEUE_SORT_OPTIONS: ReadonlyArray<{
  value: QueueSortMode;
  label: string;
}> = [
  { value: 'score', label: 'Score (highest first)' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'newest', label: 'Newest first' },
  { value: 'most-reported', label: 'Most reported' },
];

const compareScoreDesc = (a: QueueItemDto, b: QueueItemDto): number =>
  b.breakdown.total - a.breakdown.total;

/** Sort a copy of queue items for dashboard display (after filters). */
export const sortQueueItems = (
  items: readonly QueueItemDto[],
  mode: QueueSortMode
): QueueItemDto[] => {
  const sorted = [...items];

  sorted.sort((a, b) => {
    switch (mode) {
      case 'score':
        return compareScoreDesc(a, b) || b.breakdown.queueAgeHours - a.breakdown.queueAgeHours;
      case 'oldest':
        return (
          b.breakdown.queueAgeHours - a.breakdown.queueAgeHours || compareScoreDesc(a, b)
        );
      case 'newest':
        return (
          a.breakdown.queueAgeHours - b.breakdown.queueAgeHours || compareScoreDesc(a, b)
        );
      case 'most-reported':
        return (
          b.breakdown.reportCount - a.breakdown.reportCount || compareScoreDesc(a, b)
        );
      default:
        return compareScoreDesc(a, b);
    }
  });

  return sorted;
};

export const queueSortSubtitle = (mode: QueueSortMode): string => {
  switch (mode) {
    case 'oldest':
      return 'Oldest items first';
    case 'newest':
      return 'Newest items first';
    case 'most-reported':
      return 'Most reported first';
    default:
      return 'Highest scores first';
  }
};
