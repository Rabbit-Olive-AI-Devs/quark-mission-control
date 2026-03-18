import { assertHistoricalImmutability } from "@/lib/content-performance/scoring-registry";
import type { ScoreVersion } from "@/lib/content-performance/types";

export interface BackfillRequest {
  mode: "auto" | "manual";
  reason: string;
  requestedDays: number;
  parserChanged: boolean;
  lateArrivalDetected: boolean;
  existingVersion: ScoreVersion;
  recomputeVersion: ScoreVersion;
  migrationLogged?: boolean;
}

export interface BackfillPlan {
  mode: "auto" | "manual";
  reason: string;
  days: number;
  recomputeStrategy: "affected-windows-only";
  recomputeVersion: ScoreVersion;
}

export function resolveBackfillPlan(request: BackfillRequest): BackfillPlan {
  const maxDays = request.mode === "auto" ? 30 : 365;
  const days = Math.min(request.requestedDays, maxDays);

  let recomputeVersion = request.existingVersion;

  if (request.recomputeVersion !== request.existingVersion) {
    if (request.migrationLogged) {
      assertHistoricalImmutability(request.existingVersion, request.recomputeVersion, {
        allowMigration: true,
      });
      recomputeVersion = request.recomputeVersion;
    } else {
      recomputeVersion = request.existingVersion;
    }
  }

  return {
    mode: request.mode,
    reason: request.reason,
    days,
    recomputeStrategy: "affected-windows-only",
    recomputeVersion,
  };
}
