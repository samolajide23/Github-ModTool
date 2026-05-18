import { describe, expect, it } from 'vitest';
import { queueApiErrorMessage, sanitizeApiErrorMessage } from './api-error-message.js';

describe('sanitizeApiErrorMessage', () => {
  it('rejects undefined garbage strings', () => {
    expect(sanitizeApiErrorMessage('undefined undefined: undefined')).toBe('');
  });

  it('keeps normal messages', () => {
    expect(sanitizeApiErrorMessage('Only moderators of this community can use QueueIQ.')).toBe(
      'Only moderators of this community can use QueueIQ.'
    );
  });
});

describe('queueApiErrorMessage', () => {
  it('falls back on 403 when body message is garbage', () => {
    expect(
      queueApiErrorMessage(
        { type: 'error', message: 'undefined undefined: undefined' },
        403,
        {
          unauthorized: 'sign in',
          forbidden: 'mods only',
          generic: (s) => `err ${s}`,
        }
      )
    ).toBe('mods only');
  });
});
