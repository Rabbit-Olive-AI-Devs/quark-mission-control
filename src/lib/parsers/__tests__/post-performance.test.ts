/**
 * Tests for post-performance.ts parser.
 *
 * Uses vi.mock to intercept fs.readFileSync so tests never touch the real
 * workspace files. Each test configures the mock to return the desired fixture.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";

// ── Mock fs before importing the module under test ─────────────────────────
vi.mock("fs");

const mockedReadFileSync = vi.mocked(fs.readFileSync);

// Import *after* mocking so the module picks up the mocked fs
import { parsePostPerformance } from "../post-performance";

// ── Fixtures ───────────────────────────────────────────────────────────────

const MINIMAL_POST = {
  job_id: "2026-03-19-001",
  post_id: "2034764267287707892",
  platform: "x",
  content_type: "news_relay",
  format: "x_post",
  hook: "Everyone's sharing...",
  cta: "Follow for more AI operator content.",
  created_at: "2026-03-19T21:00:00Z",
  last_updated: "2026-03-20T14:22:30Z",
  metrics: {
    impressions: 580,
    likes: 12,
    replies: 3,
    retweets: 2,
    quotes: 0,
    bookmarks: 1,
    engagement_rate: 0.031,
  },
  diagnostic: "rethink",
};

const VALID_PERF_JSON = JSON.stringify({
  schema_version: 1,
  last_collected_at: "2026-03-20T14:22:33Z",
  posts: [MINIMAL_POST],
  hooks: {
    by_content_type: {
      news_relay: {
        posts: 1,
        avg_impressions: 580,
        avg_er: 0.031,
        quadrant_counts: { scale: 0, fix_hooks: 0, fix_distribution: 0, rethink: 1 },
      },
    },
    rules: { news_relay: "testing" },
    last_updated: "2026-03-20T14:28:10Z",
  },
  thresholds: {
    x: {
      viral_engagement_rate: 0.05,
      good_engagement_rate: 0.02,
      min_impressions: 100,
    },
  },
  follower_history: [{ date: "2026-03-20", x_followers: 6 }],
});

const VALID_FEEDBACK_JSON = JSON.stringify({
  generated_at: "2026-03-20T14:28:10Z",
  window_days: 7,
  posts_analyzed: 12,
  recommendations: {
    double_down: [],
    testing: ["news_relay"],
    avoid: ["war_story"],
    best_hooks: [],
    worst_hooks: [],
  },
  summary: "12 posts analyzed.",
});

// ── Helpers ────────────────────────────────────────────────────────────────

/**
 * Configure the fs mock so the first readFileSync call returns perfJson
 * and (optionally) the second returns feedbackJson.
 */
function mockFiles(perfJson: string | Error, feedbackJson?: string | Error) {
  mockedReadFileSync.mockReset();

  if (perfJson instanceof Error) {
    mockedReadFileSync.mockImplementation(() => {
      throw perfJson;
    });
    return;
  }

  // Return perfJson for the first call, feedbackJson (or throw) for the second.
  let callCount = 0;
  mockedReadFileSync.mockImplementation(() => {
    callCount++;
    if (callCount === 1) return perfJson as unknown as ReturnType<typeof fs.readFileSync>;
    if (feedbackJson instanceof Error) throw feedbackJson;
    if (feedbackJson !== undefined) return feedbackJson as unknown as ReturnType<typeof fs.readFileSync>;
    // Default: throw ENOENT for feedback file
    const e = Object.assign(new Error("ENOENT"), { code: "ENOENT" });
    throw e;
  });
}

// ── Tests ──────────────────────────────────────────────────────────────────

beforeEach(() => {
  mockedReadFileSync.mockReset();
});

describe("parsePostPerformance", () => {
  // 1. Main file missing → null
  it("returns null when the main file is missing", () => {
    mockFiles(Object.assign(new Error("ENOENT"), { code: "ENOENT" }));
    expect(parsePostPerformance()).toBeNull();
  });

  // 2. Malformed JSON in main file → null
  it("returns null when the main file contains malformed JSON", () => {
    mockFiles("{bad json");
    expect(parsePostPerformance()).toBeNull();
  });

  // 3. Valid data is parsed correctly
  it("parses valid post-performance data correctly", () => {
    mockFiles(VALID_PERF_JSON, VALID_FEEDBACK_JSON);

    const result = parsePostPerformance();
    expect(result).not.toBeNull();

    expect(result!.schemaVersion).toBe(1);
    expect(result!.lastCollectedAt).toBe("2026-03-20T14:22:33Z");

    // posts
    expect(result!.posts).toHaveLength(1);
    const post = result!.posts[0];
    expect(post.job_id).toBe("2026-03-19-001");
    expect(post.platform).toBe("x");
    expect(post.content_type).toBe("news_relay");
    expect(post.diagnostic).toBe("rethink");
    expect(post.metrics).toMatchObject({ impressions: 580, likes: 12 });

    // hooks
    expect(result!.hooks.by_content_type).toHaveProperty("news_relay");
    expect(result!.hooks.rules).toMatchObject({ news_relay: "testing" });

    // thresholds
    expect(result!.thresholds.x).toMatchObject({ viral_engagement_rate: 0.05 });

    // follower history
    expect(result!.followerHistory).toHaveLength(1);
    expect(result!.followerHistory[0].x_followers).toBe(6);

    // feedback
    expect(result!.feedback).not.toBeNull();
    expect(result!.feedback!.posts_analyzed).toBe(12);
    expect(result!.feedback!.recommendations.avoid).toContain("war_story");
    expect(result!.feedback!.summary).toMatch(/12 posts/);
  });

  // 4. Feedback file missing → feedback is null, rest parses fine
  it("handles a missing feedback file gracefully", () => {
    mockFiles(VALID_PERF_JSON /* no feedbackJson — defaults to ENOENT */);

    const result = parsePostPerformance();
    expect(result).not.toBeNull();
    expect(result!.feedback).toBeNull();
    // Core data still present
    expect(result!.posts).toHaveLength(1);
    expect(result!.lastCollectedAt).toBe("2026-03-20T14:22:33Z");
  });

  // 5. Malformed feedback JSON → feedback is null, rest parses fine
  it("handles malformed feedback JSON gracefully", () => {
    mockFiles(VALID_PERF_JSON, "{not valid json");

    const result = parsePostPerformance();
    expect(result).not.toBeNull();
    expect(result!.feedback).toBeNull();
    expect(result!.posts).toHaveLength(1);
  });

  // 6. Posts array absent → empty array
  it("returns empty posts array when the posts field is missing", () => {
    const perfNoPost = JSON.stringify({
      schema_version: 1,
      last_collected_at: "2026-03-20T00:00:00Z",
    });
    mockFiles(perfNoPost);

    const result = parsePostPerformance();
    expect(result).not.toBeNull();
    expect(result!.posts).toEqual([]);
    expect(result!.followerHistory).toEqual([]);
    expect(result!.thresholds).toEqual({});
  });
});
