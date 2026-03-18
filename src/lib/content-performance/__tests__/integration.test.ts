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
import { ContentPerformanceService } from "@/lib/content-performance/service";
import { createContentPerformanceCache } from "@/lib/content-performance/cache";

const fixture = (name: string) =>
  readFileSync(path.join(process.cwd(), "src/lib/content-performance/fixtures", name), "utf8");

describe("content-performance integration pipeline", () => {
  it("derives pipeline inputs from parsed fixtures and validates 7/14/30 windows", () => {
    const publish = parsePublishAuditJsonl(fixture("publish-valid.jsonl"), "publish-valid.jsonl");
    const engagement = parseEngagementAuditJsonl(fixture("engagement-valid.jsonl"), "engagement-valid.jsonl");
    const daily = parseDailyMetricsMarkdown(fixture("daily-valid.md"), "daily-valid.md");
    const cognitive = parseCognitiveMetricsJson(fixture("cognitive-valid.json"), "cognitive-valid.json");

    expect(publish.errors).toHaveLength(0);
    expect(engagement.errors).toHaveLength(0);
    expect(daily.errors).toHaveLength(0);
    expect(cognitive.errors).toHaveLength(0);

    const dayMap = new Map<string, { posts: number; engagements: number }>();
    publish.records.forEach((row) => {
      const current = dayMap.get(row.publishedDayKey) ?? { posts: 0, engagements: 0 };
      dayMap.set(row.publishedDayKey, { ...current, posts: current.posts + 1 });
    });
    engagement.records.forEach((row) => {
      const current = dayMap.get(row.dayKey) ?? { posts: 0, engagements: 0 };
      dayMap.set(row.dayKey, { ...current, engagements: current.engagements + row.likes + row.comments + row.shares + row.saves });
    });

    const sourceSeries = [...dayMap.entries()]
      .map(([dayKey, value]) => ({ dayKey, posts: value.posts, engagements: value.engagements }))
      .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

    const all = computeEvolutionSeries(sourceSeries);
    const anchor = all[all.length - 1].dayKey;
    const w7 = filterByWindow(all, "2026-03-04", anchor);
    const w14 = filterByWindow(all, "2026-02-25", anchor);
    const w30 = filterByWindow(all, "2026-02-09", anchor);

    expect(all.length).toBeGreaterThan(0);
    expect(w7.length).toBeGreaterThan(0);
    expect(w14.length).toBeGreaterThan(0);
    expect(w30.length).toBeGreaterThan(0);
    expect(w7.at(-1)?.totalEngagements).toBeGreaterThanOrEqual(0);

    const service = new ContentPerformanceService(createContentPerformanceCache(60 * 60 * 1000));
    const dto = service.getPageData(
      {
        publishAuditJsonl: fixture("publish-valid.jsonl"),
        engagementAuditJsonl: fixture("engagement-valid.jsonl"),
        dailyMetricsMarkdownFiles: [fixture("daily-valid.md")],
        cognitiveMetricsJsonFiles: [fixture("cognitive-valid.json")],
      },
      new Date("2026-03-18T10:00:00.000Z")
    );

    expect(dto.counts.publishRecords).toBe(publish.records.length);
    expect(dto.counts.engagementRecords).toBe(engagement.records.length);
  });

  it("keeps top-post ranking stable across reruns from parsed engagement data", () => {
    const engagement = parseEngagementAuditJsonl(fixture("engagement-valid.jsonl"), "engagement-valid.jsonl");

    const rankingInput = engagement.records.map((row) => ({
      id: row.publishId,
      platform: row.platform,
      engagement: row.likes + row.comments + row.shares + row.saves,
      views: row.views,
      scoreVersion: "v1" as const,
    }));

    const runA = rankPosts(rankingInput).map((row) => row.id);
    const runB = rankPosts(rankingInput).map((row) => row.id);

    expect(runA).toEqual(runB);
  });

  it("enforces historical score-version immutability on simulated v2", () => {
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
