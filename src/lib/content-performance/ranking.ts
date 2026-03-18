import { assertHistoricalImmutability } from "@/lib/content-performance/scoring-registry";
import type { ScoreVersion } from "@/lib/content-performance/types";

interface RankInput {
  id: string;
  platform: string;
  engagement: number;
  views: number | null;
  scoreVersion: ScoreVersion;
  recomputeVersion?: ScoreVersion;
}

interface NormalizedRow extends RankInput {
  normalizedEngagement: number;
  normalizedViews: number;
  blendedScore: number;
  rawEngagement: number;
}

const mean = (values: number[]) => values.reduce((a, b) => a + b, 0) / values.length;

const stddev = (values: number[]) => {
  if (values.length <= 1) return 0;
  const m = mean(values);
  const variance = values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length;
  return Math.sqrt(variance);
};

const z = (value: number, values: number[]) => {
  const sigma = stddev(values);
  if (sigma === 0) return 0;
  return (value - mean(values)) / sigma;
};

export function zScoreByPlatform(input: RankInput[]): NormalizedRow[] {
  const byPlatform = new Map<string, RankInput[]>();

  input.forEach((row) => {
    const existing = byPlatform.get(row.platform) ?? [];
    existing.push(row);
    byPlatform.set(row.platform, existing);
  });

  const output: NormalizedRow[] = [];

  byPlatform.forEach((rows) => {
    const engagementValues = rows.map((r) => r.engagement);
    const viewValues = rows.map((r) => r.views ?? 0);

    rows.forEach((row) => {
      const normalizedEngagement = z(row.engagement, engagementValues);
      const normalizedViews = row.views === null ? 0 : z(row.views, viewValues);
      const blendedScore = 0.6 * normalizedEngagement + 0.4 * normalizedViews;

      output.push({
        ...row,
        normalizedEngagement,
        normalizedViews,
        blendedScore,
        rawEngagement: row.engagement,
      });
    });
  });

  return output;
}

export function rankPosts(input: RankInput[]): NormalizedRow[] {
  input.forEach((row) => {
    assertHistoricalImmutability(row.scoreVersion, row.recomputeVersion ?? row.scoreVersion);
  });

  const normalized = zScoreByPlatform(input);

  return normalized.sort((a, b) => {
    if (b.blendedScore !== a.blendedScore) return b.blendedScore - a.blendedScore;
    if (b.rawEngagement !== a.rawEngagement) return b.rawEngagement - a.rawEngagement;
    return a.id.localeCompare(b.id);
  });
}
