import type { ScoreBreakdown } from './scoring.js';
import type { PrioritizedItem, StoredSnapshot } from './queue-types.js';

export const snapshotToStoredFields = (
  fields: {
    id: string;
    kind: StoredSnapshot['kind'];
    title: string;
    authorName: string;
    permalink: string;
    reportCount: number;
    text: string;
    locked?: boolean;
    ignoringReports?: boolean;
    createdAtMs?: number;
    flairText?: string;
    modReportCount?: number;
  }
): StoredSnapshot => {
  const snap: StoredSnapshot = {
    id: fields.id,
    kind: fields.kind,
    title: fields.title,
    authorName: fields.authorName,
    permalink: fields.permalink,
    reportCount: fields.reportCount,
    text: fields.text,
  };
  if (fields.locked !== undefined) {
    snap.locked = fields.locked;
  }
  if (fields.ignoringReports !== undefined) {
    snap.ignoringReports = fields.ignoringReports;
  }
  if (fields.createdAtMs !== undefined) {
    snap.createdAtMs = fields.createdAtMs;
  }
  if (fields.flairText !== undefined) {
    snap.flairText = fields.flairText;
  }
  if (fields.modReportCount !== undefined) {
    snap.modReportCount = fields.modReportCount;
  }
  return snap;
};

export const toPrioritizedItem = (
  snap: StoredSnapshot,
  breakdown: ScoreBreakdown
): PrioritizedItem => {
  const item: PrioritizedItem = {
    id: snap.id,
    kind: snap.kind,
    title: snap.title,
    authorName: snap.authorName,
    permalink: snap.permalink,
    locked: snap.locked ?? false,
    ignoringReports: snap.ignoringReports ?? false,
    breakdown,
  };
  if (snap.flairText !== undefined) {
    item.flairText = snap.flairText;
  }
  return item;
};

export const prioritizedItemToDtoFields = (
  item: PrioritizedItem
): {
  id: string;
  kind: PrioritizedItem['kind'];
  title: string;
  authorName: string;
  permalink: string;
  locked: boolean;
  ignoringReports: boolean;
  flairText?: string;
  breakdown: ScoreBreakdown;
} => {
  const base = {
    id: item.id,
    kind: item.kind,
    title: item.title,
    authorName: item.authorName,
    permalink: item.permalink,
    locked: item.locked,
    ignoringReports: item.ignoringReports,
    breakdown: item.breakdown,
  };
  if (item.flairText !== undefined) {
    return { ...base, flairText: item.flairText };
  }
  return base;
};
