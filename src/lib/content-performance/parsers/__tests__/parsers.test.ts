import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { parsePublishAuditJsonl } from "@/lib/content-performance/parsers/publishAudit";
import { parseEngagementAuditJsonl } from "@/lib/content-performance/parsers/engagementAudit";
import { parseDailyMetricsMarkdown } from "@/lib/content-performance/parsers/dailyMetrics";
import { parseCognitiveMetricsJson } from "@/lib/content-performance/parsers/cognitiveMetrics";
import { toChicagoDayKey } from "@/lib/content-performance/parsers/shared";

const fixtures = (...parts: string[]) =>
  readFileSync(path.join(process.cwd(), "src/lib/content-performance/fixtures", ...parts), "utf8");

describe("content-performance parsers", () => {
  it("parses valid source samples", () => {
    const publish = parsePublishAuditJsonl(fixtures("publish-valid.jsonl"), "publish-valid.jsonl");
    const engagement = parseEngagementAuditJsonl(fixtures("engagement-valid.jsonl"), "engagement-valid.jsonl");
    const daily = parseDailyMetricsMarkdown(fixtures("daily-valid.md"), "daily-valid.md");
    const cognitive = parseCognitiveMetricsJson(fixtures("cognitive-valid.json"), "cognitive-valid.json");

    expect(publish.errors).toHaveLength(0);
    expect(engagement.errors).toHaveLength(0);
    expect(daily.errors).toHaveLength(0);
    expect(cognitive.errors).toHaveLength(0);

    expect(publish.records.length).toBeGreaterThan(0);
    expect(engagement.records.length).toBeGreaterThan(0);
    expect(daily.records.length).toBeGreaterThan(0);
    expect(cognitive.records.length).toBeGreaterThan(0);
  });

  it("isolates malformed JSONL lines without killing ingest", () => {
    const result = parseEngagementAuditJsonl(fixtures("engagement-malformed.jsonl"), "engagement-malformed.jsonl");

    expect(result.records).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].line).toBe(2);
  });

  it("applies null/default behavior for missing views and metrics", () => {
    const result = parseEngagementAuditJsonl(fixtures("engagement-missing-fields.jsonl"), "engagement-missing-fields.jsonl");

    expect(result.errors).toHaveLength(0);
    expect(result.records[0].likes).toBe(0);
    expect(result.records[0].comments).toBe(0);
    expect(result.records[0].shares).toBe(0);
    expect(result.records[0].views).toBeNull();
    expect(result.records[0].engagementOnly).toBe(true);
  });

  it("normalizes day key across DST boundary", () => {
    const beforeMidnightChicago = toChicagoDayKey("2026-03-09T04:30:00.000Z");
    const afterMidnightChicago = toChicagoDayKey("2026-03-09T06:30:00.000Z");

    expect(beforeMidnightChicago).toBe("2026-03-08");
    expect(afterMidnightChicago).toBe("2026-03-09");
  });
});
