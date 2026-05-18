export type ScoreWeightsDto = {
  reports: number;
  bannedKeyword: number;
  lowKarmaAuthor: number;
  repeatedReporter: number;
  queueAgePerHour: number;
  youngAccount: number;
  modReport: number;
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeightsDto = {
  reports: 3,
  bannedKeyword: 5,
  lowKarmaAuthor: 4,
  repeatedReporter: 2,
  queueAgePerHour: 1,
  youngAccount: 3,
  modReport: 5,
};

export type QueueSettingsDto = {
  bannedKeywords: string;
  lowKarmaThreshold: number;
  youngAccountMaxDays: number;
  flairWeightRules: string;
  weights: ScoreWeightsDto;
  /** 0 = disabled. Items at or above this total score may be removed on each queue refresh. */
  autoRemoveAboveScore: number;
  /** When auto-remove is on, require at least this many user reports (0 = score only). */
  autoRemoveMinReports: number;
};

export type QueueItemBreakdownDto = {
  total: number;
  reportCount: number;
  bannedKeywordHits: number;
  isLowKarmaAuthor: boolean;
  repeatedReportBonus: number;
  queueAgeHours: number;
  isYoungAccount: boolean;
  modReportCount: number;
  flairBonus: number;
  reportsPoints: number;
  keywordPoints: number;
  lowKarmaPoints: number;
  repeatedPoints: number;
  queueAgePoints: number;
  youngAccountPoints: number;
  modReportPoints: number;
  flairPoints: number;
};

export type QueueItemDto = {
  id: string;
  kind: 'post' | 'comment';
  title: string;
  authorName: string;
  permalink: string;
  locked: boolean;
  ignoringReports: boolean;
  flairText?: string;
  url: string;
  breakdownShort: string;
  breakdown: QueueItemBreakdownDto;
};

export type RemovalReasonDto = {
  id: string;
  title: string;
};

export type AuditEntryDto = {
  at: string;
  mod: string;
  action: ModActionKind;
  targetId: string;
  detail?: string;
};

export type QueueResponse = {
  type: 'queue';
  /** Devvit app version serving this response (from install / upload). */
  appVersion: string;
  subredditName: string;
  itemCount: number;
  refreshedAt: string | null;
  settings: QueueSettingsDto;
  settingsUrl: string;
  settingsFromInstall: boolean;
  removalReasons: RemovalReasonDto[];
  auditLog: AuditEntryDto[];
  items: QueueItemDto[];
};

export type QueueErrorResponse = {
  type: 'error';
  message: string;
};

export type ModActionKind =
  | 'approve'
  | 'remove'
  | 'spam'
  | 'lock'
  | 'unlock'
  | 'ignore-reports'
  | 'unignore-reports'
  | 'ban-user';

export type ModActionOptions = {
  note?: string;
  modNote?: string;
  removalReasonId?: string;
  banUsername?: string;
  /** Temporary ban length in days; omit or 0 for permanent. */
  banDurationDays?: number;
};

export type ModActionRequest = {
  id: string;
  action: ModActionKind;
  note?: string;
  modNote?: string;
  removalReasonId?: string;
  banUsername?: string;
  banDurationDays?: number;
};

export type ModActionResponse = {
  type: 'mod-action';
  action: ModActionKind;
  id: string;
  queue: QueueResponse;
};
