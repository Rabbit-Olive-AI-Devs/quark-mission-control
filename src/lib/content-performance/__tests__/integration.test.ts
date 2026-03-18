import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePublishAuditJsonl } from "@/lib/content-performance/parsers/publishAudit";
import { parseEngagementAuditJsonl } from "@/lib/content-performance/parsers/engagementAudit";
import { parseDailyMetricsMarkdown } from "@/lib/content-performance/parsers/dailyMetrics";
import { parseCognitiveMetricsJson } from "@/lib/content-performance/parsers/cognitiveMetrics";
import { computeEvolutionSeries } from "@/lib/content-performance/aggregate";
import { rankPosts } from "@/lib/content-performance/ranking";
import { filterByWindow } from "@/lib/content-performance/window";
import { assertHistoricalImmutability } from "@/lib/content-performance/scoring-registry";
import { resolveBackfillPlan } from "@/lib/content-performance/backfill";

const fixture = (name: string) =>
  readFileSync(path.join(process.cwd(), "src/lib/content-performance/fixtures", name), "utf8");

describe("content-performance integration pipeline", () => {
  it("parses all sources and builds expected 7/14/30 window series", () => {
    const publish = parsePublishAuditJsonl(fixture("publish-valid.jsonl"), "publish-valid.jsonl");
    const engagement = parseEngagementAuditJsonl(fixture("engagement-valid.jsonl"), "engagement-valid.jsonl");
    const daily = parseDailyMetricsMarkdown(fixture("daily-valid.md"), "daily-valid.md");
    const cognitive = parseCognitiveMetricsJson(fixture("cognitive-valid.json"), "cognitive-valid.json");

    expect(publish.errors).toHaveLength(0);
    expect(engagement.errors).toHaveLength(0);
    expect(daily.errors).toHaveLength(0);
    expect(cognitive.errors).toHaveLength(0);

    const sourceSeries = [
      { dayKey: "2026-03-01", posts: 1, engagements: 10 },
      { dayKey: "2026-03-02", posts: 2, engagements: 22 },
      { dayKey: "2026-03-03", posts: 1, engagements: 14 },
      { dayKey: "2026-03-04", posts: 2, engagements: 18 },
      { dayKey: "2026-03-05", posts: 1, engagements: 12 },
      { dayKey: "2026-03-06", posts: 3, engagements: 21 },
      { dayKey: "2026-03-07", posts: 1, engagements: 9 },
      { dayKey: "2026-03-08", posts: 2, engagements: 16 },
      { dayKey: "2026-03-09", posts: 1, engagements: 11 },
      { dayKey: "2026-03-10", posts: 2, engagements: 13 },
      { dayKey: "2026-03-11", posts: 1, engagements: 8 },
      { dayKey: "2026-03-12", posts: 2, engagements: 19 },
      { dayKey: "2026-03-13", posts: 1, engagements: 7 },
      { dayKey: "2026-03-14", posts: 2, engagements: 15 },
    ];

    const all = computeEvolutionSeries(sourceSeries);
    const w7 = filterByWindow(all, "2026-03-08", "2026-03-14");
    const w14 = filterByWindow(all, "2026-03-01", "2026-03-14");
    const w30 = filterByWindow(all, "2026-02-13", "2026-03-14");

    expect(w7).toHaveLength(7);
    expect(w14).toHaveLength(14);
    expect(w30).toHaveLength(14);
    expect(w7.at(-1)?.totalEngagements).toBe(15);
    expect(w14[0].engagementPerPost).toBe(10);
  });

  it("keeps top-post ranking stable across reruns", () => {
    const input = [
      { id: "p1", platform: "x", engagement: 40, views: 400, scoreVersion: "v1" as const },
      { id: "p2", platform: "x", engagement: 28, views: 320, scoreVersion: "v1" as const },
      { id: "p3", platform: "x", engagement: 15, views: 120, scoreVersion: "v1" as const },
    ];

    const runA = rankPosts(input).map((row) => row.id);
    const runB = rankPosts(input).map((row) => row.id);

    expect(runA).toEqual(runB);
  });

  it("enforces historical score-version immutability when simulating v2 recompute", () => {
    expect(() => assertHistoricalImmutability("v1", "v2")).toThrow(/historical recompute/i);
  });

  it("keeps backfill recompute scoped to impacted windows only", () => {
    const plan = resolveBackfillPlan({
      mode: "auto",
      reason: "late-arrival",
      requestedDays: 120,
      parserChanged: false,
      lateArrivalDetected: true,
      existingVersion: "v1",
      recomputeVersion: "v1",
    });

    expect(plan.recomputeStrategy).toBe("affected-windows-only");
    expect(plan.days).toBe(30);
  });
});
