import type { ModActionKind, ModActionOptions } from './api.js';

/** Build ModActionOptions without assigning explicit `undefined` fields. */
export const modActionOptionsFromParts = (parts: {
  note?: string;
  modNote?: string;
  removalReasonId?: string;
  banUsername?: string;
  banDurationDays?: number;
}): ModActionOptions => {
  const opts: ModActionOptions = {};
  if (parts.note !== undefined) {
    opts.note = parts.note;
  }
  if (parts.modNote !== undefined) {
    opts.modNote = parts.modNote;
  }
  if (parts.removalReasonId !== undefined) {
    opts.removalReasonId = parts.removalReasonId;
  }
  if (parts.banUsername !== undefined) {
    opts.banUsername = parts.banUsername;
  }
  if (parts.banDurationDays !== undefined) {
    opts.banDurationDays = parts.banDurationDays;
  }
  return opts;
};

export type AuditEntryLike = {
  at: string;
  mod: string;
  action: ModActionKind;
  targetId: string;
  detail?: string;
};

export const auditEntryFromParts = (parts: {
  at: string;
  mod: string;
  action: ModActionKind;
  targetId: string;
  detail?: string;
}): AuditEntryLike => {
  const entry: AuditEntryLike = {
    at: parts.at,
    mod: parts.mod,
    action: parts.action,
    targetId: parts.targetId,
  };
  if (parts.detail !== undefined) {
    entry.detail = parts.detail;
  }
  return entry;
};
