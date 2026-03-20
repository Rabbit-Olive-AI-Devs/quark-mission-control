/**
 * Tests for content-lifecycle.ts parser.
 *
 * Uses vi.mock to intercept fs so tests never touch real workspace files.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

// ── Mock fs before importing the module under test ─────────────────────────
vi.mock("fs");

const mockedReadFileSync = vi.mocked(fs.readFileSync);
const mockedReaddirSync = vi.mocked(fs.readdirSync);

// Import *after* mocking so the module picks up the mocked fs
import { parseFunnel, parseCadence, parseTypeMix, parseFeedback } from "../content-lifecycle";

// ── Fixtures ───────────────────────────────────────────────────────────────

const AUDIT_LINES = [
  '{"job_id":"job-001","content_type":"proof","outcome":"published","format":"x_post","published_at":"2026-03-18T19:15:27Z"}',
  '{"job_id":"job-001","content_type":"proof","outcome":"published","format":"tiktok_video","published_at":"2026-03-18T19:20:00Z"}',
  '{"job_id":"job-002","content_type":"news_relay","outcome":"published","format":"x_thread","published_at":"2026-03-19T12:00:00Z"}',
  '{"job_id":"job-003","content_type":"hot_take","outcome":"quarantined","quarantine_reason":"max retries exceeded","quarantined_at":"2026-03-19T10:00:00Z"}',
  '{"job_id":"job-004","content_type":"reaction","outcome":"killed","kill_reason":"stale content","killed_at":"2026-03-19T11:00:00Z"}',
  '{"job_id":"job-005","content_type":"viral_ride","outcome":"published","format":"instagram_video","published_at":"2026-03-17T14:00:00Z"}',
  '{"job_id":"job-006","content_type":"proof","outcome":"published","format":"x_post","published_at":"2026-03-12T10:00:00Z"}',
  '{"job_id":"job-007","content_type":"news_relay","outcome":"published","format":"tiktok_video","published_at":"2026-03-11T08:00:00Z"}',
].join("\n");

const REJECTED_FILE_1 = JSON.stringify({
  job_id: "rej-001",
  rejection_reason: "duplicate_topic",
});

const REJECTED_FILE_2 = JSON.stringify({
  job_id: "rej-002",
  rejection_reason: "missing_creative_brief",
});

const REJECTED_FILE_3 = JSON.stringify({
  job_id: "rej-003",
  reject_reason: "duplicate_topic",
});

const QUARANTINED_FILE_1 = JSON.stringify({
  job_id: "quar-001",
  quarantine_reason: "max retries exceeded",
});

const QUARANTINED_FILE_2 = JSON.stringify({
  job_id: "quar-002",
  kill_reason: "stale content",
});

const WEIGHTS_JSON = JSON.stringify({
  version: 1,
  updated_at: "2026-03-10T00:00:00Z",
  weights: {
    proof: 0.25,
    news_relay: 0.2,
    viral_ride: 0.15,
    hot_take: 0.15,
    war_story: 0.15,
    reaction: 0.1,
  },
});

const FEEDBACK_JSON = JSON.stringify({
  generated_at: "2026-03-20T14:28:10Z",
  window_days: 7,
  posts_analyzed: 12,
  recommendations: {
    double_down: [],
    testing: ["proof"],
    avoid: ["war_story"],
  },
  summary: "12 posts analyzed.",
});

// ── Helpers ────────────────────────────────────────────────────────────────

type FsFileMap = Record<string, string>;
type FsDirMap = Record<string, string[]>;

/**
 * Configure mocks to serve files by path pattern matching and directory
 * listings by path pattern matching.
 */
function mockFs(files: FsFileMap, dirs: FsDirMap) {
  mockedReadFileSync.mockReset();
  mockedReaddirSync.mockReset();

  mockedReadFileSync.mockImplementation((p: fs.PathOrFileDescriptor) => {
    const filePath = String(p);
    for (const [pattern, content] of Object.entries(files)) {
      if (filePath.includes(pattern)) {
        return content as unknown as ReturnType<typeof fs.readFileSync>;
      }
    }
    throw Object.assign(new Error("ENOENT: " + filePath), { code: "ENOENT" });
  });

  mockedReaddirSync.mockImplementation((p: fs.PathLike) => {
    const dirPath = String(p);
    for (const [pattern, entries] of Object.entries(dirs)) {
      if (dirPath.includes(pattern)) {
        return entries as unknown as ReturnType<typeof fs.readdirSync>;
      }
    }
    throw Object.assign(new Error("ENOENT: " + dirPath), { code: "ENOENT" });
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockedReadFileSync.mockReset();
  mockedReaddirSync.mockReset();
});

describe("parseFunnel", () => {
  it("counts intake buckets correctly", () => {
    mockFs(
      {
        "publish-audit.jsonl": AUDIT_LINES,
        "rejected/rej-001.json": REJECTED_FILE_1,
        "rejected/rej-002.json": REJECTED_FILE_2,
        "rejected/rej-003.json": REJECTED_FILE_3,
        "quarantined/quar-001.json": QUARANTINED_FILE_1,
        "quarantined/quar-002.json": QUARANTINED_FILE_2,
      },
      {
        "intake/completed": ["job-001.json", "job-002.json", "job-005.json", "job-006.json", "job-007.json"],
        "intake/rejected": ["rej-001.json", "rej-002.json", "rej-003.json"],
        "intake/quarantined": ["quar-001.json", "quar-002.json"],
        "intake/canceled": ["can-001.json", "can-002.json"],
      }
    );

    const result = parseFunnel();

    // totalSubmitted = completed(5) + rejected(3) + quarantined(2) + canceled(2) = 12
    expect(result.totalSubmitted).toBe(12);

    // Stages
    const stageMap = Object.fromEntries(result.stages.map((s) => [s.stage, s.count]));
    expect(stageMap.submitted).toBe(12);
    expect(stageMap.gate_passed).toBe(5);
    expect(stageMap.rejected).toBe(3);
    expect(stageMap.quarantined).toBe(2);
    expect(stageMap.canceled).toBe(2);

    // Published = unique job_ids with outcome=published: job-001, job-002, job-005, job-006, job-007
    expect(stageMap.published).toBe(5);

    // conversionRate = 5/12
    expect(result.conversionRate).toBeCloseTo(5 / 12, 4);
  });

  it("extracts rejection reasons", () => {
    mockFs(
      {
        "publish-audit.jsonl": "",
        "rejected/rej-001.json": REJECTED_FILE_1,
        "rejected/rej-002.json": REJECTED_FILE_2,
        "rejected/rej-003.json": REJECTED_FILE_3,
        "quarantined/quar-001.json": QUARANTINED_FILE_1,
        "quarantined/quar-002.json": QUARANTINED_FILE_2,
      },
      {
        "intake/completed": [],
        "intake/rejected": ["rej-001.json", "rej-002.json", "rej-003.json"],
        "intake/quarantined": ["quar-001.json", "quar-002.json"],
        "intake/canceled": [],
      }
    );

    const result = parseFunnel();

    // rejection_reason from rej-001 and reject_reason from rej-003 both = "duplicate_topic"
    expect(result.rejectionReasons["duplicate_topic"]).toBe(2);
    expect(result.rejectionReasons["missing_creative_brief"]).toBe(1);

    // quarantine reasons
    expect(result.quarantineReasons["max retries exceeded"]).toBe(1);
    expect(result.quarantineReasons["stale content"]).toBe(1);
  });
});

describe("parseCadence", () => {
  it("groups by date and platform", () => {
    // Use a minimal audit with entries on two different dates
    const twoDateAudit = [
      '{"job_id":"a","content_type":"proof","outcome":"published","format":"x_post","published_at":"2026-03-18T19:00:00Z"}',
      '{"job_id":"b","content_type":"proof","outcome":"published","format":"tiktok_video","published_at":"2026-03-18T20:00:00Z"}',
      '{"job_id":"c","content_type":"news_relay","outcome":"published","format":"x_thread","published_at":"2026-03-19T12:00:00Z"}',
      '{"job_id":"d","content_type":"reaction","outcome":"published","format":"instagram_video","published_at":"2026-03-19T14:00:00Z"}',
    ].join("\n");

    mockFs({ "publish-audit.jsonl": twoDateAudit }, {});

    const result = parseCadence();

    // daily should have 30 entries
    expect(result.daily).toHaveLength(30);

    // Find March 18 (Chicago time — 19:00 UTC = 14:00 CT, still March 18)
    const mar18 = result.daily.find((d) => d.date === "2026-03-18");
    expect(mar18).toBeDefined();
    expect(mar18!.x).toBe(1);
    expect(mar18!.tiktok).toBe(1);
    expect(mar18!.total).toBe(2);

    // Find March 19
    const mar19 = result.daily.find((d) => d.date === "2026-03-19");
    expect(mar19).toBeDefined();
    expect(mar19!.x).toBe(1);
    expect(mar19!.instagram).toBe(1);
    expect(mar19!.total).toBe(2);
  });

  it("computes 7d average", () => {
    // 7 entries, one per day for the last 7 days, 2 posts each
    const today = new Date();
    const chicagoStr = today.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    const chicagoDate = new Date(chicagoStr + "T00:00:00");

    const lines: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(chicagoDate);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      lines.push(
        `{"job_id":"j${i}a","content_type":"proof","outcome":"published","format":"x_post","published_at":"${dateStr}T12:00:00Z"}`
      );
      lines.push(
        `{"job_id":"j${i}b","content_type":"news_relay","outcome":"published","format":"tiktok_video","published_at":"${dateStr}T14:00:00Z"}`
      );
    }

    mockFs({ "publish-audit.jsonl": lines.join("\n") }, {});

    const result = parseCadence();

    // 14 posts over 7 days = 2.0 per day
    expect(result.avgPerDay7d).toBe(2);
  });
});

describe("parseTypeMix", () => {
  it("computes actual vs target percentages", () => {
    // 4 published jobs: 2 proof, 1 news_relay, 1 viral_ride
    const auditLines = [
      '{"job_id":"t1","content_type":"proof","outcome":"published","format":"x_post","published_at":"2026-03-18T12:00:00Z"}',
      '{"job_id":"t2","content_type":"proof","outcome":"published","format":"x_post","published_at":"2026-03-18T13:00:00Z"}',
      '{"job_id":"t3","content_type":"news_relay","outcome":"published","format":"x_post","published_at":"2026-03-18T14:00:00Z"}',
      '{"job_id":"t4","content_type":"viral_ride","outcome":"published","format":"x_post","published_at":"2026-03-18T15:00:00Z"}',
      // duplicate job_id should be deduped
      '{"job_id":"t1","content_type":"proof","outcome":"published","format":"tiktok_video","published_at":"2026-03-18T16:00:00Z"}',
    ].join("\n");

    mockFs(
      {
        "publish-audit.jsonl": auditLines,
        "content-type-weights.json": WEIGHTS_JSON,
      },
      {}
    );

    const result = parseTypeMix();

    // 4 unique published jobs: proof=2 (50%), news_relay=1 (25%), viral_ride=1 (25%)
    const proofEntry = result.entries.find((e) => e.contentType === "proof");
    expect(proofEntry).toBeDefined();
    expect(proofEntry!.actualCount).toBe(2);
    expect(proofEntry!.actualPct).toBe(0.5);
    expect(proofEntry!.targetPct).toBe(0.25);
    expect(proofEntry!.delta).toBe(0.25);

    const newsEntry = result.entries.find((e) => e.contentType === "news_relay");
    expect(newsEntry).toBeDefined();
    expect(newsEntry!.actualCount).toBe(1);
    expect(newsEntry!.actualPct).toBe(0.25);
    expect(newsEntry!.targetPct).toBe(0.2);
    expect(newsEntry!.delta).toBe(0.05);

    // Types in weights but not published should appear with actualCount=0
    const hotTakeEntry = result.entries.find((e) => e.contentType === "hot_take");
    expect(hotTakeEntry).toBeDefined();
    expect(hotTakeEntry!.actualCount).toBe(0);
    expect(hotTakeEntry!.actualPct).toBe(0);
    expect(hotTakeEntry!.targetPct).toBe(0.15);
    expect(hotTakeEntry!.delta).toBe(-0.15);
  });

  it("reports weight staleness", () => {
    mockFs(
      {
        "publish-audit.jsonl": "",
        "content-type-weights.json": WEIGHTS_JSON,
      },
      {}
    );

    const result = parseTypeMix();

    // updated_at is "2026-03-10T00:00:00Z" — should be >0 days stale
    expect(result.weightsUpdatedAt).toBe("2026-03-10T00:00:00Z");
    expect(result.weightsStaleDays).toBeGreaterThan(0);
  });
});

describe("parseFeedback", () => {
  it("returns feedback when file exists", () => {
    mockFs({ "content-feedback.json": FEEDBACK_JSON }, {});

    const result = parseFeedback();
    expect(result).not.toBeNull();
    expect(result!.posts_analyzed).toBe(12);
    expect(result!.recommendations.avoid).toContain("war_story");
  });

  it("returns null when file is missing", () => {
    mockFs({}, {});

    const result = parseFeedback();
    expect(result).toBeNull();
  });
});
