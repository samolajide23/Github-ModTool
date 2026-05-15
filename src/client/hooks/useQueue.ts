import { useCallback, useEffect, useState } from 'react';
import type { QueueErrorResponse, QueueResponse } from '../../shared/api.js';

type QueueState = {
  data: QueueResponse | null;
  error: string | null;
  loading: boolean;
  refreshing: boolean;
};

export const useQueue = () => {
  const [state, setState] = useState<QueueState>({
    data: null,
    error: null,
    loading: true,
    refreshing: false,
  });

  const load = useCallback(async (refresh = false) => {
    setState((prev) => ({
      ...prev,
      loading: !refresh && prev.data === null,
      refreshing: refresh,
      error: null,
    }));

    try {
      const response = await fetch(refresh ? '/api/refresh' : '/api/queue', {
        method: refresh ? 'POST' : 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      const json = (await response.json()) as QueueResponse | QueueErrorResponse;

      if (!response.ok || json.type === 'error') {
        const message =
          json.type === 'error' ? json.message : `Request failed (${response.status})`;
        throw new Error(message);
      }

      setState({
        data: json,
        error: null,
        loading: false,
        refreshing: false,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load queue';
      console.error('QueueIQ dashboard load failed', err);
      setState((prev) => ({
        ...prev,
        error: message,
        loading: false,
        refreshing: false,
      }));
    }
  }, []);

  useEffect(() => {
    void load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return {
    ...state,
    refresh,
  };
};
