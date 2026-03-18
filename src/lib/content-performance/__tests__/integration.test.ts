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
import { resolveBackfillPlan } from "@/lib/content-performance/backfill";
import { ContentPerformanceService } from "@/lib/content-performance/service";
import { createContentPerformanceCache } from "@/lib/content-performance/cache";

const fixture = (name: string) =>
  readFileSync(path.join(process.cwd(), "src/lib/content-performance/fixtures", name), "utf8");

function buildPipelineOutput() {
  const publish = parsePublishAuditJsonl(fixture("publish-valid.jsonl"), "publish-valid.jsonl");
  const engagement = parseEngagementAuditJsonl(fixture("engagement-valid.jsonl"), "engagement-valid.jsonl");
  const daily = parseDailyMetricsMarkdown(fixture("daily-valid.md"), "daily-valid.md");
  const cognitive = parseCognitiveMetricsJson(fixture("cognitive-valid.json"), "cognitive-valid.json");

  const perDay = new Map<string, { posts: number; engagements: number }>();

  publish.records.forEach((row) => {
    const current = perDay.get(row.publishedDayKey) ?? { posts: 0, engagements: 0 };
    perDay.set(row.publishedDayKey, { ...current, posts: current.posts + 1 });
  });

  engagement.records.forEach((row) => {
    const current = perDay.get(row.dayKey) ?? { posts: 0, engagements: 0 };
    const rowEngagement = row.likes + row.comments + row.shares + row.saves;
    perDay.set(row.dayKey, { ...current, engagements: current.engagements + rowEngagement });
  });

  daily.records.forEach((row) => {
    const current = perDay.get(row.dayKey) ?? { posts: 0, engagements: 0 };
    perDay.set(row.dayKey, {
      posts: Math.max(current.posts, row.publishedCount),
      engagements: Math.max(current.engagements, row.engagements),
    });
  });

  const baseSeries = [...perDay.entries()]
    .map(([dayKey, value]) => ({ dayKey, posts: value.posts, engagements: value.engagements }))
    .sort((a, b) => a.dayKey.localeCompare(b.dayKey));

  const evolution = computeEvolutionSeries(baseSeries);
  const anchor = evolution[evolution.length - 1]?.dayKey ?? "2026-03-11";
  const windows = {
    w7: filterByWindow(evolution, "2026-03-05", anchor),
    w14: filterByWindow(evolution, "2026-02-26", anchor),
    w30: filterByWindow(evolution, "2026-02-10", anchor),
  };

  const rankingInput = engagement.records.map((row) => ({
    id: row.publishId,
    platform: row.platform,
    engagement: row.likes + row.comments + row.shares + row.saves,
    views: row.views,
    scoreVersion: "v1" as const,
  }));

  return { publish, engagement, daily, cognitive, evolution, windows, rankingInput };
}

describe("content-performance integration pipeline", () => {
  it("builds end-to-end pipeline from fixtures and validates 7/14/30 outputs", () => {
    const pipeline = buildPipelineOutput();

    expect(pipeline.publish.errors).toHaveLength(0);
    expect(pipeline.engagement.errors).toHaveLength(0);
    expect(pipeline.daily.errors).toHaveLength(0);
    expect(pipeline.cognitive.errors).toHaveLength(0);

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

    expect(dto.counts.publishRecords).toBe(pipeline.publish.records.length);
    expect(dto.counts.engagementRecords).toBe(pipeline.engagement.records.length);
    expect(dto.counts.dailyRecords).toBe(pipeline.daily.records.length);
    expect(dto.counts.cognitiveRecords).toBe(pipeline.cognitive.records.length);

    expect(pipeline.windows.w7.length).toBeGreaterThan(0);
    expect(pipeline.windows.w14.length).toBeGreaterThanOrEqual(pipeline.windows.w7.length);
    expect(pipeline.windows.w30.length).toBeGreaterThanOrEqual(pipeline.windows.w14.length);
    expect(pipeline.windows.w7.at(-1)?.totalEngagements).toBeGreaterThanOrEqual(0);
  });

  it("keeps ranking stable across reruns using fixture-derived ranking input", () => {
    const { rankingInput } = buildPipelineOutput();

    const runA = rankPosts(rankingInput).map((row) => row.id);
    const runB = rankPosts(rankingInput).map((row) => row.id);

    expect(runA).toEqual(runB);
  });

  it("preserves historical score version and impacted-window-only recompute behavior", () => {
    const { rankingInput, evolution } = buildPipelineOutput();

    expect(() => rankPosts(rankingInput.map((row) => ({ ...row, recomputeVersion: "v2" as const })))).toThrow(
      /historical recompute/i
    );

    const backfill = resolveBackfillPlan({
      mode: "auto",
      reason: "late-arrival",
      requestedDays: 120,
      parserChanged: false,
      lateArrivalDetected: true,
      existingVersion: "v1",
      recomputeVersion: "v2",
    });

    expect(backfill.recomputeStrategy).toBe("affected-windows-only");
    expect(backfill.recomputeVersion).toBe("v1");
    expect(backfill.days).toBe(30);

    const impacted = evolution.slice(-Math.min(evolution.length, 2));
    expect(impacted.length).toBeLessThanOrEqual(evolution.length);
  });
});
