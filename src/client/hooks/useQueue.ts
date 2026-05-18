import { useCallback, useEffect, useState } from 'react';
import type {
  ModActionKind,
  ModActionOptions,
  ModActionResponse,
  QueueResponse,
} from '../../shared/api.js';
import { queueApiErrorMessage } from '../../shared/api-error-message.js';

const readQueueFetchErrorMessage = (json: unknown, httpStatus: number): string =>
  queueApiErrorMessage(json, httpStatus, {
    unauthorized: 'Sign in to Reddit to use QueueIQ.',
    forbidden: 'Only moderators of this community can use QueueIQ.',
    generic: (status) => `Could not load queue (HTTP ${status}).`,
  });

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

  const load = useCallback(async (refresh = false) => {
    setState((prev) => ({
      ...prev,
      loading: !refresh && prev.data === null,
      refreshing: refresh,
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

      const isQueueError =
        json &&
        typeof json === 'object' &&
        'type' in json &&
        (json as { type: string }).type === 'error';

      const isQueueOk =
        json &&
        typeof json === 'object' &&
        'type' in json &&
        (json as { type: string }).type === 'queue';

      if (!response.ok || isQueueError || !isQueueOk) {
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
        return;
      }

      setState({
        data: json as QueueResponse,
        error: null,
        loading: false,
        refreshing: false,
        actingOnId: null,
        accessDenied: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load queue';
      console.error('QueueIQ dashboard load failed', err);
      setState((prev) => ({
        ...prev,
        error: message,
        loading: false,
        refreshing: false,
        actingOnId: null,
        accessDenied: false,
      }));
    }
  }, []);

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

        const isErr =
          json &&
          typeof json === 'object' &&
          'type' in json &&
          (json as { type: string }).type === 'error';
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

        setState({
          data: (json as ModActionResponse).queue,
          error: null,
          loading: false,
          refreshing: false,
          actingOnId: null,
          accessDenied: false,
        });
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
    [onSuccess]
  );

  return {
    ...state,
    refresh,
    performAction,
  };
};
