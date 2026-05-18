import { useCallback, useEffect, useState } from 'react';

export const useToast = (durationMs = 4000) => {
  const [message, setMessage] = useState<string | null>(null);

  const showToast = useCallback((text: string) => {
    setMessage(text);
  }, []);

  const clearToast = useCallback(() => {
    setMessage(null);
  }, []);

  useEffect(() => {
    if (!message) {
      return;
    }
    const timer = window.setTimeout(() => setMessage(null), durationMs);
    return () => window.clearTimeout(timer);
  }, [durationMs, message]);

  return { message, showToast, clearToast };
};
