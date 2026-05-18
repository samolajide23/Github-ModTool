import { context, redis } from '@devvit/web/server';
import type { ModActionKind } from '../shared/api.js';
import { REDIS_KEYS } from './constants.js';

export type AuditEntry = {
  at: string;
  mod: string;
  action: ModActionKind;
  targetId: string;
  detail?: string;
};

const MAX_AUDIT_ENTRIES = 100;

export const appendAuditLog = async (
  action: ModActionKind,
  targetId: string,
  detail?: string
): Promise<void> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return;
  }

  const mod = context.username ?? context.userId ?? 'unknown';
  const entry: AuditEntry = {
    at: new Date().toISOString(),
    mod: String(mod),
    action,
    targetId,
    detail: detail?.slice(0, 500),
  };

  try {
    const key = REDIS_KEYS.auditLog(subredditId);
    const raw = await redis.get(key);
    const list: AuditEntry[] = raw ? (JSON.parse(raw) as AuditEntry[]) : [];
    list.unshift(entry);
    await redis.set(key, JSON.stringify(list.slice(0, MAX_AUDIT_ENTRIES)));
  } catch (error) {
    console.error('appendAuditLog failed', error);
  }
};

export const loadAuditLog = async (limit = 25): Promise<AuditEntry[]> => {
  const subredditId = context.subredditId;
  if (!subredditId) {
    return [];
  }

  try {
    const raw = await redis.get(REDIS_KEYS.auditLog(subredditId));
    if (!raw) {
      return [];
    }
    const list = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(list) ? list.slice(0, limit) : [];
  } catch {
    return [];
  }
};
