import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  ModActionKind,
  ModActionOptions,
  ModActionResponse,
  QueueResponse,
} from '../../shared/api.js';
import { queueApiErrorMessage } from '../../shared/api-error-message.js';

const POLL_INTERVAL_MS = 3000;
const POLL_MAX_ATTEMPTS = 40;

const readQueueFetchErrorMessage = (json: unknown, httpStatus: number): string =>
  queueApiErrorMessage(json, httpStatus, {
    unauthorized: 'Sign in to Reddit to use QueueIQ.',
    forbidden: 'Only moderators of this community can use QueueIQ.',
    generic: (status) => `Could not load queue (HTTP ${status}).`,
  });

const isQueueResponse = (json: unknown): json is QueueResponse =>
  Boolean(
    json &&
      typeof json === 'object' &&
      'type' in json &&
      (json as { type: string }).type === 'queue'
  );

const isQueueError = (json: unknown): boolean =>
  Boolean(
    json &&
      typeof json === 'object' &&
      'type' in json &&
      (json as { type: string }).type === 'error'
  );

const isNewerRefresh = (previous: string | null, next: string | null): boolean => {
  if (!next) {
    return false;
  }
  if (!previous) {
    return true;
  }
  return new Date(next).getTime() > new Date(previous).getTime();
};

type QueueState = {
  data: QueueResponse | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
  actingOnId: string | null;
  /** True when API returned 401/403 — show minimal UI, not the mod dashboard chrome. */
  accessDenied: boolean;
};

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

export const useQueue = (onSuccess?: (message: string) => void) => {
  const [state, setState] = useState<QueueState>({
    data: null,
    error: null,
    loading: true,
    refreshing: false,
    actingOnId: null,
    accessDenied: false,
  });

  const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  const stopPolling = useCallback(() => {
    if (pollTimerRef.current) {
      clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
    pollAttemptsRef.current = 0;
  }, []);

  const applyQueueData = useCallback(
    (data: QueueResponse, options?: { keepRefreshing?: boolean }) => {
      const stillRefreshing =
        options?.keepRefreshing ?? Boolean(data.refreshing || data.stale);
      setState((prev) => ({
        data,
        error: null,
        loading: false,
        refreshing: stillRefreshing,
        actingOnId: prev.actingOnId,
        accessDenied: false,
      }));
      return stillRefreshing;
    },
    []
  );

  const fetchQueue = useCallback(async (): Promise<QueueResponse | null> => {
    const response = await fetch('/api/queue', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    let json: unknown;
    try {
      json = await response.json();
    } catch {
      json = null;
    }

    if (!response.ok || isQueueError(json) || !isQueueResponse(json)) {
      const message = readQueueFetchErrorMessage(json, response.status);
      const accessDenied = response.status === 401 || response.status === 403;
      setState({
        data: null,
        error: message,
        loading: false,
        refreshing: false,
        actingOnId: null,
        accessDenied,
      });
      return null;
    }

    return json;
  }, []);

  const startPollingForFreshData = useCallback(
    (baselineRefreshedAt: string | null) => {
      stopPolling();

      pollTimerRef.current = setInterval(() => {
        pollAttemptsRef.current += 1;
        if (pollAttemptsRef.current > POLL_MAX_ATTEMPTS) {
          stopPolling();
          setState((prev) => ({ ...prev, refreshing: false }));
          return;
        }

        void (async () => {
          const data = await fetchQueue();
          if (!data) {
            stopPolling();
            return;
          }

          const updated =
            isNewerRefresh(baselineRefreshedAt, data.refreshedAt) ||
            (!data.stale && !data.refreshing);

          if (updated) {
            stopPolling();
            applyQueueData(data, { keepRefreshing: false });
            return;
          }

          applyQueueData(data, { keepRefreshing: true });
        })();
      }, POLL_INTERVAL_MS);
    },
    [applyQueueData, fetchQueue, stopPolling]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  const load = useCallback(
    async (refresh = false) => {
      setState((prev) => ({
        ...prev,
        loading: !refresh && prev.data === null,
        refreshing: refresh || prev.refreshing,
        error: null,
        accessDenied: false,
      }));

      try {
        const response = await fetch(refresh ? '/api/refresh' : '/api/queue', {
          method: refresh ? 'POST' : 'GET',
          headers: { 'Content-Type': 'application/json' },
        });

        let json: unknown;
        try {
          json = await response.json();
        } catch {
          json = null;
        }

        if (!response.ok || isQueueError(json) || !isQueueResponse(json)) {
          const message = readQueueFetchErrorMessage(json, response.status);
          const accessDenied = response.status === 401 || response.status === 403;
          stopPolling();
          setState({
            data: null,
            error: message,
            loading: false,
            refreshing: false,
            actingOnId: null,
            accessDenied,
          });
          return;
        }

        const data = json;
        const needsPoll = applyQueueData(data, {
          keepRefreshing: Boolean(data.refreshing || data.stale),
        });
        if (needsPoll) {
          startPollingForFreshData(data.refreshedAt);
        } else {
          stopPolling();
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load queue';
        console.error('QueueIQ dashboard load failed', err);
        stopPolling();
        setState((prev) => ({
          ...prev,
          error: message,
          loading: false,
          refreshing: false,
          actingOnId: null,
          accessDenied: false,
        }));
      }
    },
    [applyQueueData, startPollingForFreshData, stopPolling]
  );

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  const performAction = useCallback(
    async (id: string, action: ModActionKind, options: ModActionOptions = {}) => {
      setState((prev) => ({
        ...prev,
        actingOnId: id,
        error: null,
      }));

      try {
        const response = await fetch('/api/items/action', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, action, ...options }),
        });

        const json: unknown = await response.json().catch(() => null);

        const isErr = isQueueError(json);
        const isOk =
          json &&
          typeof json === 'object' &&
          'type' in json &&
          (json as { type: string }).type === 'mod-action';

        if (!response.ok || isErr || !isOk) {
          const message = readQueueFetchErrorMessage(json, response.status);
          const accessDenied = response.status === 401 || response.status === 403;
          setState((prev) => ({
            ...prev,
            data: accessDenied ? null : prev.data,
            actingOnId: null,
            error: message,
            accessDenied,
          }));
          return;
        }

        const queue = (json as ModActionResponse).queue;
        const baseline = state.data?.refreshedAt ?? null;
        const needsPoll = applyQueueData(queue, {
          keepRefreshing: Boolean(queue.refreshing || queue.stale),
        });
        if (needsPoll) {
          startPollingForFreshData(baseline);
        }

        onSuccess?.(`${ACTION_LABELS[action]} — queue updated`);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Mod action failed';
        console.error('QueueIQ mod action failed', err);
        setState((prev) => ({
          ...prev,
          actingOnId: null,
          error: message,
        }));
      }
    },
    [applyQueueData, onSuccess, startPollingForFreshData, state.data?.refreshedAt]
  );

  return {
    ...state,
    refresh,
    performAction,
  };
};
