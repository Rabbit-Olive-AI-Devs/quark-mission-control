import { describe, expect, it } from "vitest";
import { createContentPerformanceCache } from "@/lib/content-performance/cache";
import { ContentPerformanceService } from "@/lib/content-performance/service";
import { resolveBackfillPlan } from "@/lib/content-performance/backfill";

const baseSources = {
  publishAuditJsonl:
    '{"id":"pub-1","platform":"x","contentType":"analysis","publishedAt":"2026-03-10T16:40:00.000Z","recordedAt":"2026-03-10T17:00:00.000Z"}\n',
  engagementAuditJsonl:
    '{"publishId":"pub-1","platform":"x","capturedAt":"2026-03-10T18:00:00.000Z","likes":10,"comments":2,"shares":1,"views":100}\n',
  dailyMetricsMarkdown:
    '---\ndate: 2026-03-10\nplatform: x\npublishedCount: 1\nimpressions: 100\nengagements: 13\n---\nDaily.',
  cognitiveMetricsJson: '[{"signalDate":"2026-03-10T20:00:00.000Z","cognitiveScore":0.9,"degradationDetected":false}]',
};

describe("content-performance service", () => {
  it("uses cache hit within hourly TTL and refreshes after TTL", () => {
    const cache = createContentPerformanceCache(60 * 60 * 1000);
    const service = new ContentPerformanceService(cache);

    const t0 = new Date("2026-03-10T12:00:00.000Z");
    const first = service.getPageData(baseSources, t0);
    const second = service.getPageData(baseSources, new Date("2026-03-10T12:30:00.000Z"));
    const third = service.getPageData(baseSources, new Date("2026-03-10T13:30:01.000Z"));

    expect(first.meta.refreshedAt).toBe(second.meta.refreshedAt);
    expect(third.meta.refreshedAt).not.toBe(second.meta.refreshedAt);
  });

  it("triggers stale metadata when lastSuccessAt older than 90 minutes", () => {
    const cache = createContentPerformanceCache(2 * 60 * 60 * 1000);
    const service = new ContentPerformanceService(cache);

    service.getPageData(baseSources, new Date("2026-03-10T12:00:00.000Z"));
    const result = service.getPageData(baseSources, new Date("2026-03-10T13:31:00.000Z"));

    expect(result.meta.stale).toBe(true);
    expect(result.meta.lastSuccessAt).toBe("2026-03-10T12:00:00.000Z");
  });

  it("enforces backfill limits and preserves scoreVersion without migration", () => {
    const autoPlan = resolveBackfillPlan({
      mode: "auto",
      reason: "late-arrival",
      requestedDays: 120,
      parserChanged: true,
      lateArrivalDetected: true,
      existingVersion: "v1",
      recomputeVersion: "v2",
    });

    expect(autoPlan.days).toBe(30);
    expect(autoPlan.recomputeStrategy).toBe("affected-windows-only");
    expect(autoPlan.recomputeVersion).toBe("v1");

    const manualPlan = resolveBackfillPlan({
      mode: "manual",
      reason: "operator",
      requestedDays: 730,
      parserChanged: false,
      lateArrivalDetected: false,
      existingVersion: "v1",
      recomputeVersion: "v1",
    });

    expect(manualPlan.days).toBe(365);
  });
});
