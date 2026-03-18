import { DEFAULT_SCORE_VERSION, SCORE_V1_WEIGHTS } from "@/lib/content-performance/constants";
import type { ScoreVersion, ScoreVersionStatus, ScoringWeights } from "@/lib/content-performance/types";

export interface ScoreRegistryEntry {
  scoreVersion: ScoreVersion;
  effectiveFrom: string;
  effectiveTo?: string;
  status: ScoreVersionStatus;
  successorVersion?: ScoreVersion;
  weights: ScoringWeights;
}

export const SCORE_REGISTRY: readonly ScoreRegistryEntry[] = [
  {
    scoreVersion: "v1",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    status: "active",
    weights: {
      engagement: SCORE_V1_WEIGHTS.engagement,
      views: SCORE_V1_WEIGHTS.views,
    },
  },
] as const;

export function validateDeprecatedVersionSuccessor(entry: ScoreRegistryEntry): void {
  if (entry.status === "deprecated" && !entry.successorVersion) {
    throw new Error(`Deprecated score version ${entry.scoreVersion} requires successorVersion.`);
  }
}

export function validateDeprecationMappings(entries: readonly ScoreRegistryEntry[]): void {
  entries.forEach(validateDeprecatedVersionSuccessor);
}

export function getScoreVersionForDate(date: Date): ScoreVersion {
  const timestamp = date.getTime();

  const matching = SCORE_REGISTRY.find((entry) => {
    const start = new Date(entry.effectiveFrom).getTime();
    const end = entry.effectiveTo ? new Date(entry.effectiveTo).getTime() : Number.POSITIVE_INFINITY;
    return timestamp >= start && timestamp <= end;
  });

  if (!matching) {
    return DEFAULT_SCORE_VERSION;
  }

  return matching.scoreVersion;
}

interface ImmutabilityOptions {
  allowMigration?: boolean;
}

export function assertHistoricalImmutability(
  existingVersion: ScoreVersion,
  recomputeVersion: ScoreVersion,
  options: ImmutabilityOptions = {}
): void {
  if (existingVersion === recomputeVersion) {
    return;
  }

  if (options.allowMigration) {
    return;
  }

  throw new Error(
    `Historical recompute cannot switch scoreVersion from ${existingVersion} to ${recomputeVersion} without migration.`
  );
}

validateDeprecationMappings(SCORE_REGISTRY);
