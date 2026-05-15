export type ScoreWeightsDto = {
  reports: number;
  bannedKeyword: number;
  lowKarmaAuthor: number;
  repeatedReporter: number;
};

export const DEFAULT_SCORE_WEIGHTS: ScoreWeightsDto = {
  reports: 3,
  bannedKeyword: 5,
  lowKarmaAuthor: 4,
  repeatedReporter: 2,
};

export type QueueSettingsDto = {
  bannedKeywords: string;
  lowKarmaThreshold: number;
  weights: ScoreWeightsDto;
};

export type QueueItemDto = {
  id: string;
  kind: 'post' | 'comment';
  title: string;
  authorName: string;
  permalink: string;
  url: string;
  breakdownShort: string;
  breakdown: {
    total: number;
    reportCount: number;
    bannedKeywordHits: number;
    isLowKarmaAuthor: boolean;
    repeatedReportBonus: number;
    reportsPoints: number;
    keywordPoints: number;
    lowKarmaPoints: number;
    repeatedPoints: number;
  };
};

export type QueueResponse = {
  type: 'queue';
  subredditName: string;
  itemCount: number;
  refreshedAt: string | null;
  settings: QueueSettingsDto;
  /** Install settings page (developers.reddit.com). */
  settingsUrl: string;
  /** True when values were read from Install settings; false if defaults (e.g. playtest). */
  settingsFromInstall: boolean;
  items: QueueItemDto[];
};

export type QueueErrorResponse = {
  type: 'error';
  message: string;
};
