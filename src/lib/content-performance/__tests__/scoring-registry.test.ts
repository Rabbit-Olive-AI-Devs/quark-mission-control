import { describe, expect, it } from "vitest";
import {
  assertHistoricalImmutability,
  getScoreVersionForDate,
  validateDeprecatedVersionSuccessor,
  type ScoreRegistryEntry,
} from "@/lib/content-performance/scoring-registry";

describe("scoring registry governance", () => {
  it("resolves score version by date", () => {
    const version = getScoreVersionForDate(new Date("2026-03-18T00:00:00.000Z"));

    expect(version).toBe("v1");
  });

  it("requires successor mapping for deprecated version", () => {
    const deprecatedWithoutSuccessor: ScoreRegistryEntry = {
      scoreVersion: "v1",
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      status: "deprecated",
      weights: {
        engagement: 0.6,
        views: 0.4,
      },
    };

    expect(() => validateDeprecatedVersionSuccessor(deprecatedWithoutSuccessor)).toThrow(
      /requires successorVersion/i
    );
  });

  it("rejects historical recompute with different score version unless migration enabled", () => {
    expect(() => assertHistoricalImmutability("v1", "v2")).toThrow(/historical recompute/i);

    expect(() =>
      assertHistoricalImmutability("v1", "v2", {
        allowMigration: true,
      })
    ).not.toThrow();
  });
});
