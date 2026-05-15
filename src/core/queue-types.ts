import type { ScoreBreakdown } from './scoring.js';

export type QueueItemKind = 'post' | 'comment';

export type PrioritizedItem = {
  id: string;
  kind: QueueItemKind;
  title: string;
  authorName: string;
  permalink: string;
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
};
