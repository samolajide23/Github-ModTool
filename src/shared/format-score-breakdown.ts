import type { QueueItemBreakdownDto, ScoreWeightsDto } from './api.js';
import { formatScoreNumber } from './format-score-number.js';

/** Detailed lines for expanded card UI (client-safe, no server imports). */
export const formatScoreBreakdownLines = (
  breakdown: QueueItemBreakdownDto,
  weights: ScoreWeightsDto
): string[] => {
  const lines: string[] = [`Total score: ${formatScoreNumber(breakdown.total)} pts`];

  if (breakdown.reportCount > 0) {
    lines.push(
      `Reports: ${breakdown.reportCount} × ${formatScoreNumber(weights.reports)} = +${formatScoreNumber(breakdown.reportsPoints)}`
    );
  }
  if (breakdown.bannedKeywordHits > 0) {
    lines.push(
      `Banned keywords: ${breakdown.bannedKeywordHits} × ${formatScoreNumber(weights.bannedKeyword)} = +${formatScoreNumber(breakdown.keywordPoints)}`
    );
  }
  if (breakdown.isLowKarmaAuthor) {
    lines.push(`Low-karma author: +${formatScoreNumber(breakdown.lowKarmaPoints)}`);
  }
  if (breakdown.repeatedReportBonus > 0) {
    lines.push(
      `Repeat reports: ${breakdown.repeatedReportBonus} × ${formatScoreNumber(weights.repeatedReporter)} = +${formatScoreNumber(breakdown.repeatedPoints)}`
    );
  }
  if (breakdown.queueAgeHours > 0) {
    lines.push(
      `Time in queue: ${breakdown.queueAgeHours}h × ${formatScoreNumber(weights.queueAgePerHour)} = +${formatScoreNumber(breakdown.queueAgePoints)}`
    );
  }
  if (breakdown.isYoungAccount) {
    lines.push(`Young account: +${formatScoreNumber(breakdown.youngAccountPoints)}`);
  }
  if (breakdown.modReportCount > 0) {
    lines.push(
      `Mod reports: ${breakdown.modReportCount} × ${formatScoreNumber(weights.modReport)} = +${formatScoreNumber(breakdown.modReportPoints)}`
    );
  }
  if (breakdown.flairBonus > 0) {
    lines.push(`Flair rule match: +${formatScoreNumber(breakdown.flairPoints)}`);
  }

  if (lines.length === 1) {
    lines.push('No scoring signals beyond base checks.');
  }

  return lines;
};
