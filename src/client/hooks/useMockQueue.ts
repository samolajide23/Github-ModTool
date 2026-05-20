import { useCallback, useMemo, useState } from 'react';
import {
  DEFAULT_SCORE_WEIGHTS,
  QUEUE_FETCH_LIMIT,
  type ModActionKind,
  type ModActionOptions,
  type QueueResponse,
} from '../../shared/api.js';
import { getInstallSettingsUrl } from '../../shared/install-settings-url.js';
import { buildMockPrioritizedQueue } from '../../core/mock-queue.js';
import { toQueueItemDto } from '../../core/queue-dto.js';
import type { AuditEntryDto } from '../../shared/api.js';

const ACTION_LABELS: Record<ModActionKind, string> = {
  approve: 'Approved',
  remove: 'Removed',
  spam: 'Marked as spam',
  lock: 'Locked',
  unlock: 'Unlocked',
  'ignore-reports': 'Ignored reports',
  'unignore-reports': 'Unignored reports',
  'ban-user': 'Banned user',
};

const buildMockResponse = (itemCount = QUEUE_FETCH_LIMIT): QueueResponse => {
  const weights = { ...DEFAULT_SCORE_WEIGHTS };
  const items = buildMockPrioritizedQueue(itemCount);
  return {
    type: 'queue',
    appVersion: 'local-mock',
    subredditName: 'queue_toolk_dev (mock)',
    totalInQueue: items.length,
    itemCount: items.length,
    refreshedAt: new Date().toISOString(),
    settings: {
      bannedKeywords: 'spam, scam, phishing, giveaway, free money',
      lowKarmaThreshold: 100,
      youngAccountMaxDays: 7,
      flairWeightRules: 'Spam:10',
      weights,
      autoRemoveAboveScore: 0,
      autoRemoveMinReports: 0,
    },
    settingsUrl: getInstallSettingsUrl('queue_toolk_dev'),
    settingsFromInstall: true,
    removalReasons: [
      { id: 'mock-spam', title: 'Spam' },
      { id: 'mock-rule1', title: 'Rule violation' },
    ],
    auditLog: [],
    items: items.map(toQueueItemDto),
  };
};

export const useMockQueue = (onSuccess?: (message: string) => void) => {
  const [data, setData] = useState<QueueResponse>(() => buildMockResponse());
  const [actingOnId, setActingOnId] = useState<string | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntryDto[]>([]);

  const refresh = useCallback(() => {
    setData(buildMockResponse());
    onSuccess?.('Queue refreshed (mock)');
  }, [onSuccess]);

  const performAction = useCallback(
    async (id: string, action: ModActionKind, options: ModActionOptions = {}) => {
      setActingOnId(id);
      await new Promise((resolve) => setTimeout(resolve, 350));

      setData((prev) => {
        if (action === 'approve' || action === 'remove' || action === 'spam') {
          const items = prev.items.filter((item) => item.id !== id);
          return {
            ...prev,
            items,
            totalInQueue: items.length,
            itemCount: items.length,
            refreshedAt: new Date().toISOString(),
          };
        }

        if (action === 'ban-user') {
          const victim = prev.items.find((item) => item.id === id);
          const author = victim?.authorName;
          const items = author
            ? prev.items.filter((item) => item.authorName !== author)
            : prev.items.filter((item) => item.id !== id);
          return {
            ...prev,
            items,
            totalInQueue: items.length,
            itemCount: items.length,
            refreshedAt: new Date().toISOString(),
          };
        }

        if (action === 'lock' || action === 'unlock') {
          const items = prev.items.map((item) =>
            item.id === id ? { ...item, locked: action === 'lock' } : item
          );
          return { ...prev, items, refreshedAt: new Date().toISOString() };
        }

        if (action === 'ignore-reports' || action === 'unignore-reports') {
          const items = prev.items.map((item) =>
            item.id === id
              ? { ...item, ignoringReports: action === 'ignore-reports' }
              : item
          );
          return { ...prev, items, refreshedAt: new Date().toISOString() };
        }

        return { ...prev, refreshedAt: new Date().toISOString() };
      });

      setAuditLog((log) => [
        {
          at: new Date().toISOString(),
          mod: 'demo_mod',
          action,
          targetId: id,
          detail: [
            options.note && `note: ${options.note}`,
            options.modNote && `mod: ${options.modNote}`,
            options.banDurationDays && `ban ${options.banDurationDays}d`,
          ]
            .filter(Boolean)
            .join('; ') || undefined,
        },
        ...log,
      ].slice(0, 25));

      setActingOnId(null);
      onSuccess?.(`${ACTION_LABELS[action]} (mock preview)`);
    },
    [onSuccess]
  );

  const dataWithAudit = useMemo(
    () => ({ ...data, auditLog: auditLog.length > 0 ? auditLog : data.auditLog }),
    [auditLog, data]
  );

  return useMemo(
    () => ({
      data: dataWithAudit,
      loading: false as const,
      refreshing: false as const,
      actingOnId,
      refresh,
      performAction,
    }),
    [actingOnId, dataWithAudit, performAction, refresh]
  );
};
