import type { ScoreBreakdown } from './scoring.js';

export type QueueItemKind = 'post' | 'comment';

export type PrioritizedItem = {
  id: string;
  kind: QueueItemKind;
  title: string;
  authorName: string;
  permalink: string;
  locked: boolean;
  ignoringReports: boolean;
  flairText?: string;
  breakdown: ScoreBreakdown;
};

export type StoredSnapshot = {
  id: string;
  kind: QueueItemKind;
  title: string;
  authorName: string;
  permalink: string;
  reportCount: number;
  text: string;
  locked?: boolean;
  ignoringReports?: boolean;
  /** Unix ms when the post/comment was created. */
  createdAtMs?: number;
  flairText?: string;
  modReportCount?: number;
};
