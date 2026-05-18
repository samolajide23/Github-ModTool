/** Drop broken Devvit/Reddit error strings like "undefined undefined: undefined". */
export const sanitizeApiErrorMessage = (message: string | undefined | null): string => {
  if (message == null) {
    return '';
  }
  const trimmed = String(message).trim();
  if (!trimmed || /\bundefined\b/i.test(trimmed)) {
    return '';
  }
  return trimmed;
};

export const queueApiErrorMessage = (
  json: unknown,
  httpStatus: number,
  fallbacks: { unauthorized: string; forbidden: string; generic: (status: number) => string }
): string => {
  if (
    json &&
    typeof json === 'object' &&
    'type' in json &&
    (json as { type: string }).type === 'error' &&
    'message' in json
  ) {
    const fromBody = sanitizeApiErrorMessage(String((json as { message: unknown }).message));
    if (fromBody) {
      return fromBody;
    }
  }

  if (httpStatus === 401) {
    return fallbacks.unauthorized;
  }
  if (httpStatus === 403) {
    return fallbacks.forbidden;
  }
  return fallbacks.generic(httpStatus);
};
