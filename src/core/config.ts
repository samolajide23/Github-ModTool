import { settings } from '@devvit/web/server';
import {
  DEFAULT_LOW_KARMA_THRESHOLD,
  DEFAULT_SCORE_WEIGHTS,
  type ScoreWeights,
} from './constants.js';
import { parseInstallNumber, parseInstallString } from './install-settings-parse.js';
import { normalizeScoreWeights } from './score-weights.js';

export type QueueConfig = {
  bannedKeywords: string[];
  lowKarmaThreshold: number;
  weights: ScoreWeights;
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
};

const INSTALL_SETTING_KEYS = [
  'bannedKeywords',
  'lowKarmaThreshold',
  'scoreWeightReports',
  'scoreWeightKeywords',
  'scoreWeightLowKarma',
  'scoreWeightRepeatReports',
] as const;

const fallbackConfig = (): QueueConfig => ({
  bannedKeywords: parseKeywords(DEFAULT_KEYWORDS),
  lowKarmaThreshold: DEFAULT_LOW_KARMA_THRESHOLD,
  weights: { ...DEFAULT_SCORE_WEIGHTS },
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
      merged[key] = value as InstallSettings[typeof key];
    }
  }

  return merged;
};

const configFromInstallSettings = (all: InstallSettings): QueueConfig => {
  const keywordsRaw = parseInstallString(all.bannedKeywords, DEFAULT_KEYWORDS);

  const threshold = parseInstallNumber(
    all.lowKarmaThreshold,
    DEFAULT_LOW_KARMA_THRESHOLD
  );

  const weights = normalizeScoreWeights({
    reports: parseInstallNumber(all.scoreWeightReports, DEFAULT_SCORE_WEIGHTS.reports),
    bannedKeyword: parseInstallNumber(
      all.scoreWeightKeywords,
      DEFAULT_SCORE_WEIGHTS.bannedKeyword
    ),
    lowKarmaAuthor: parseInstallNumber(
      all.scoreWeightLowKarma,
      DEFAULT_SCORE_WEIGHTS.lowKarmaAuthor
    ),
    repeatedReporter: parseInstallNumber(
      all.scoreWeightRepeatReports,
      DEFAULT_SCORE_WEIGHTS.repeatedReporter
    ),
  });

  return {
    bannedKeywords: parseKeywords(keywordsRaw),
    lowKarmaThreshold: threshold,
    weights,
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
    });
    return { config, fromInstall: true };
  } catch (error) {
    console.error('loadQueueConfig: install settings unavailable', error);
    return { config: fallbackConfig(), fromInstall: false };
  }
};
