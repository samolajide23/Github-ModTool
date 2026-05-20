import { settings } from '@devvit/web/server';
import {
  DEFAULT_FLAIR_RULES,
  DEFAULT_LOW_KARMA_THRESHOLD,
  DEFAULT_SCORE_WEIGHTS,
  DEFAULT_YOUNG_ACCOUNT_MAX_DAYS,
  type ScoreWeights,
} from './constants.js';
import { parseFlairRules } from './flair-rules.js';
import {
  parseInstallDecimal,
  parseInstallNumber,
  parseInstallString,
} from './install-settings-parse.js';
import { roundScoreValue } from './score-values.js';
import { normalizeScoreWeights } from './score-weights.js';

export type QueueConfig = {
  bannedKeywords: string[];
  lowKarmaThreshold: number;
  youngAccountMaxDays: number;
  flairRulesRaw: string;
  flairRules: Map<string, number>;
  weights: ScoreWeights;
  /**
   * If > 0, each queue refresh may **remove** items whose total score is >= this value.
   * Use with care; 0 disables auto-remove.
   */
  autoRemoveAboveScore: number;
  /**
   * When auto-remove is enabled (`autoRemoveAboveScore` > 0), only remove items with at least this many user reports.
   * Set to 0 to ignore (score-only gate — higher false-positive risk).
   */
  autoRemoveMinReports: number;
};

export type LoadQueueConfigResult = {
  config: QueueConfig;
  /** False when install settings API failed (e.g. playtest) — defaults are used instead. */
  fromInstall: boolean;
};

const DEFAULT_KEYWORDS =
  'spam, scam, phishing, giveaway, free money';

const parseKeywords = (raw: string): string[] =>
  raw
    .split(/[,;\n]+/)
    .map((word) => word.trim().toLowerCase())
    .filter(Boolean);

type InstallSettings = {
  bannedKeywords?: string;
  lowKarmaThreshold?: number | string;
  scoreWeightReports?: number | string;
  scoreWeightKeywords?: number | string;
  scoreWeightLowKarma?: number | string;
  scoreWeightRepeatReports?: number | string;
  scoreWeightQueueAge?: number | string;
  scoreWeightYoungAccount?: number | string;
  scoreWeightModReports?: number | string;
  youngAccountMaxDays?: number | string;
  flairWeightRules?: string;
  autoRemoveAboveScore?: number | string;
  autoRemoveMinReports?: number | string;
};

const INSTALL_SETTING_KEYS = [
  'bannedKeywords',
  'lowKarmaThreshold',
  'scoreWeightReports',
  'scoreWeightKeywords',
  'scoreWeightLowKarma',
  'scoreWeightRepeatReports',
  'scoreWeightQueueAge',
  'scoreWeightYoungAccount',
  'scoreWeightModReports',
  'youngAccountMaxDays',
  'flairWeightRules',
  'autoRemoveAboveScore',
  'autoRemoveMinReports',
] as const;

const DEFAULT_AUTO_REMOVE_ABOVE_SCORE = 0;
/** Default when install settings omit the key (new installs get a safer gate). */
const DEFAULT_AUTO_REMOVE_MIN_REPORTS = 2;
const MAX_AUTO_REMOVE_THRESHOLD = 500;

const clampAutoRemoveThreshold = (n: number): number =>
  roundScoreValue(
    Math.min(MAX_AUTO_REMOVE_THRESHOLD, Math.max(0, Number.isFinite(n) ? n : 0))
  );

const clampAutoRemoveMinReports = (n: number): number =>
  Math.min(100, Math.max(0, Math.floor(Number.isFinite(n) ? n : 0)));

const fallbackConfig = (): QueueConfig => ({
  bannedKeywords: parseKeywords(DEFAULT_KEYWORDS),
  lowKarmaThreshold: DEFAULT_LOW_KARMA_THRESHOLD,
  youngAccountMaxDays: DEFAULT_YOUNG_ACCOUNT_MAX_DAYS,
  flairRulesRaw: DEFAULT_FLAIR_RULES,
  flairRules: parseFlairRules(DEFAULT_FLAIR_RULES),
  weights: { ...DEFAULT_SCORE_WEIGHTS },
  autoRemoveAboveScore: DEFAULT_AUTO_REMOVE_ABOVE_SCORE,
  autoRemoveMinReports: 0,
});

const readRawInstallSettings = async (): Promise<InstallSettings> => {
  const fromAll = await settings.getAll<InstallSettings>();

  const fromEach = await Promise.all(
    INSTALL_SETTING_KEYS.map(async (key) => {
      const value = await settings.get(key);
      return [key, value] as const;
    })
  );

  const merged: InstallSettings = { ...fromAll };
  for (const [key, value] of fromEach) {
    if (value !== undefined && value !== null && value !== '') {
      (merged as Record<string, string | number>)[key] = value as string | number;
    }
  }

  return merged;
};

const configFromInstallSettings = (all: InstallSettings): QueueConfig => {
  const keywordsRaw = parseInstallString(all.bannedKeywords, DEFAULT_KEYWORDS);
  const flairRulesRaw = parseInstallString(all.flairWeightRules, DEFAULT_FLAIR_RULES);

  const lowKarmaThreshold = parseInstallNumber(
    all.lowKarmaThreshold,
    DEFAULT_LOW_KARMA_THRESHOLD
  );

  const weights = normalizeScoreWeights({
    reports: parseInstallDecimal(all.scoreWeightReports, DEFAULT_SCORE_WEIGHTS.reports),
    bannedKeyword: parseInstallDecimal(
      all.scoreWeightKeywords,
      DEFAULT_SCORE_WEIGHTS.bannedKeyword
    ),
    lowKarmaAuthor: parseInstallDecimal(
      all.scoreWeightLowKarma,
      DEFAULT_SCORE_WEIGHTS.lowKarmaAuthor
    ),
    repeatedReporter: parseInstallDecimal(
      all.scoreWeightRepeatReports,
      DEFAULT_SCORE_WEIGHTS.repeatedReporter
    ),
    queueAgePerHour: parseInstallDecimal(
      all.scoreWeightQueueAge,
      DEFAULT_SCORE_WEIGHTS.queueAgePerHour
    ),
    youngAccount: parseInstallDecimal(
      all.scoreWeightYoungAccount,
      DEFAULT_SCORE_WEIGHTS.youngAccount
    ),
    modReport: parseInstallDecimal(all.scoreWeightModReports, DEFAULT_SCORE_WEIGHTS.modReport),
  });

  return {
    bannedKeywords: parseKeywords(keywordsRaw),
    lowKarmaThreshold,
    youngAccountMaxDays: parseInstallNumber(
      all.youngAccountMaxDays,
      DEFAULT_YOUNG_ACCOUNT_MAX_DAYS
    ),
    flairRulesRaw,
    flairRules: parseFlairRules(flairRulesRaw),
    weights,
    autoRemoveAboveScore: clampAutoRemoveThreshold(
      parseInstallDecimal(all.autoRemoveAboveScore, DEFAULT_AUTO_REMOVE_ABOVE_SCORE)
    ),
    autoRemoveMinReports: clampAutoRemoveMinReports(
      parseInstallNumber(all.autoRemoveMinReports, DEFAULT_AUTO_REMOVE_MIN_REPORTS)
    ),
  };
};

/** Loads all QueueIQ options from Mod Tools → Install settings. */
export const loadQueueConfig = async (): Promise<LoadQueueConfigResult> => {
  try {
    const raw = await readRawInstallSettings();
    const config = configFromInstallSettings(raw);
    console.log('QueueIQ: loaded install settings', {
      keywordCount: config.bannedKeywords.length,
      lowKarmaThreshold: config.lowKarmaThreshold,
      weights: config.weights,
      autoRemoveAboveScore: config.autoRemoveAboveScore,
      autoRemoveMinReports: config.autoRemoveMinReports,
    });
    return { config, fromInstall: true };
  } catch (error) {
    console.error('loadQueueConfig: install settings unavailable', error);
    return { config: fallbackConfig(), fromInstall: false };
  }
};
