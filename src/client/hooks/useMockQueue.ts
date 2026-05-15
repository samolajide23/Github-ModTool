import { useMemo } from 'react';
import { DEFAULT_SCORE_WEIGHTS, type QueueResponse } from '../../shared/api.js';
import { getInstallSettingsUrl } from '../../shared/install-settings-url.js';
import { buildMockPrioritizedQueue } from '../../core/mock-queue.js';
import { toQueueItemDto } from '../../core/queue-dto.js';

export const useMockQueue = (): {
  data: QueueResponse;
  loading: false;
  refreshing: false;
  refresh: () => void;
} => {
  const data = useMemo((): QueueResponse => {
    const weights = { ...DEFAULT_SCORE_WEIGHTS };
    const items = buildMockPrioritizedQueue(25, weights);
    return {
      type: 'queue',
      subredditName: 'queue_toolk_dev (mock)',
      itemCount: items.length,
      refreshedAt: new Date().toISOString(),
      settings: {
        bannedKeywords: 'spam, scam, phishing, giveaway, free money',
        lowKarmaThreshold: 100,
        weights,
      },
      settingsUrl: getInstallSettingsUrl('queue_toolk_dev'),
      settingsFromInstall: true,
      items: items.map(toQueueItemDto),
    };
  }, []);

  return {
    data,
    loading: false,
    refreshing: false,
    refresh: () => {
      /* mock — no-op */
    },
  };
};
