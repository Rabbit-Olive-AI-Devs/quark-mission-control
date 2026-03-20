/**
 * Tests for engagement.ts data quality fixes.
 *
 * Tests are written against the exported helper functions, which are
 * intentionally exposed for testing via named exports added alongside
 * the fixes.
 */

import { describe, it, expect } from "vitest";
import {
  deduplicateActions,
  normalizeAuditLine,
  isRealEngagement,
  isGuardrailFailure,
} from "../engagement";
import type { EngagementAction } from "../types";

// ── helpers ──────────────────────────────────────────────────────────────────

function makeAction(overrides: Partial<EngagementAction> = {}): EngagementAction {
  return {
    timestamp: "2026-03-19T14:07:15Z",
    platform: "x",
    action: "like",
    targetId: "abc123",
    targetAuthor: "someone",
    text: "",
    autonomous: true,
    guardrailResult: "pass",
    source: "engagement_cron",
    ...overrides,
  };
}

// ── 1. deduplicateActions ─────────────────────────────────────────────────────

describe("deduplicateActions", () => {
  it("keeps a single entry when there is no duplicate", () => {
    const actions = [makeAction()];
    expect(deduplicateActions(actions)).toHaveLength(1);
  });

  it("deduplicates same action+platform+targetId regardless of source", () => {
    // Mirrors the real file pattern: manual and engagement_cron log the same action
    const actions = [
      makeAction({ source: "manual", timestamp: "2026-03-19T17:37:36Z" }),
      makeAction({ source: "engagement_cron", timestamp: "2026-03-19T17:31:00Z" }),
    ];
    const result = deduplicateActions(actions);
    expect(result).toHaveLength(1);
    // First occurrence is kept
    expect(result[0].source).toBe("manual");
  });

  it("keeps entries with different targetIds", () => {
    const actions = [
      makeAction({ targetId: "id1" }),
      makeAction({ targetId: "id2" }),
    ];
    expect(deduplicateActions(actions)).toHaveLength(2);
  });

  it("keeps entries with different platforms", () => {
    const actions = [
      makeAction({ platform: "x" }),
      makeAction({ platform: "instagram" }),
    ];
    expect(deduplicateActions(actions)).toHaveLength(2);
  });

  it("keeps entries with different action types", () => {
    const actions = [
      makeAction({ action: "like" }),
      makeAction({ action: "reply" }),
    ];
    expect(deduplicateActions(actions)).toHaveLength(2);
  });

  it("deduplicates multiple occurrences down to first", () => {
    const actions = [
      makeAction({ source: "manual", timestamp: "T1" }),
      makeAction({ source: "engagement_cron", timestamp: "T2" }),
      makeAction({ source: "engagement_cron", timestamp: "T3" }),
    ];
    expect(deduplicateActions(actions)).toHaveLength(1);
  });

  it("keeps engagement_cron entry when it appears before manual for the same dedup key", () => {
    const actions = [
      makeAction({ source: "engagement_cron", timestamp: "2026-03-19T17:31:00Z" }),
      makeAction({ source: "manual", timestamp: "2026-03-19T17:37:36Z" }),
    ];
    const result = deduplicateActions(actions);
    expect(result).toHaveLength(1);
    expect(result[0].source).toBe("engagement_cron");
  });
});

// ── 2. normalizeAuditLine ─────────────────────────────────────────────────────

describe("normalizeAuditLine", () => {
  it("passes through a well-formed standard-schema line unchanged", () => {
    const raw = JSON.stringify({
      timestamp: "2026-03-19T14:07:15Z",
      platform: "x",
      action: "like",
      target_id: "abc123",
      target_author: "someone",
      text: "hi",
      autonomous: true,
      guardrail_result: "pass",
      source: "engagement_cron",
    });
    const result = normalizeAuditLine(raw);
    expect(result).not.toBeNull();
    expect(result!.action).toBe("like");
    expect(result!.targetId).toBe("abc123");
    expect(result!.guardrailResult).toBe("pass");
  });

  it("normalizes a health-check line with result/detail schema (no action)", () => {
    // Lines 281-285 in real JSONL: platform-level health check, no action/target
    const raw = JSON.stringify({
      timestamp: "2026-03-19T19:30:00Z",
      platform: "x",
      result: "pass",
      detail: "all_mentions_already_replied",
    });
    const result = normalizeAuditLine(raw);
    expect(result).not.toBeNull();
    expect(result!.action).toBe("check");
    expect(result!.guardrailResult).toBe("pass");
    expect(result!.targetId).toBe("");
  });

  it("normalizes an action line with result/target schema (old format)", () => {
    // Lines 286-288 in real JSONL: action + target (not target_id)
    const raw = JSON.stringify({
      timestamp: "2026-03-19T19:30:00Z",
      platform: "x",
      action: "follow",
      target: "hex_agent",
      result: "success",
    });
    const result = normalizeAuditLine(raw);
    expect(result).not.toBeNull();
    expect(result!.action).toBe("follow");
    expect(result!.targetId).toBe("hex_agent");
    // "success" is not a known guardrail_result — normalize to "pass"
    expect(result!.guardrailResult).toBe("pass");
  });

  it("returns null for unparseable JSON", () => {
    expect(normalizeAuditLine("{bad json")).toBeNull();
  });

  it("returns null for empty string", () => {
    expect(normalizeAuditLine("")).toBeNull();
  });

  it("defaults autonomous to false when field is absent (health-check schema)", () => {
    const raw = JSON.stringify({
      timestamp: "2026-03-19T19:30:00Z",
      platform: "x",
      result: "pass",
      detail: "all_mentions_already_replied",
    });
    const result = normalizeAuditLine(raw);
    expect(result).not.toBeNull();
    expect(result!.autonomous).toBe(false);
  });
});

// ── 3. isRealEngagement ───────────────────────────────────────────────────────

describe("isRealEngagement", () => {
  it("returns true for like", () => {
    expect(isRealEngagement(makeAction({ action: "like" }))).toBe(true);
  });

  it("returns true for reply", () => {
    expect(isRealEngagement(makeAction({ action: "reply" }))).toBe(true);
  });

  it("returns true for follow", () => {
    expect(isRealEngagement(makeAction({ action: "follow" }))).toBe(true);
  });

  it("returns true for comment", () => {
    expect(isRealEngagement(makeAction({ action: "comment" }))).toBe(true);
  });

  it("returns true for skip", () => {
    expect(isRealEngagement(makeAction({ action: "skip" }))).toBe(true);
  });

  it("returns false for check", () => {
    expect(isRealEngagement(makeAction({ action: "check" }))).toBe(false);
  });

  it("returns false for actions starting with check:", () => {
    expect(isRealEngagement(makeAction({ action: "check:health" }))).toBe(false);
  });
});

// ── 4. isGuardrailFailure ─────────────────────────────────────────────────────

describe("isGuardrailFailure", () => {
  it("returns false for pass", () => {
    expect(isGuardrailFailure("pass")).toBe(false);
  });

  it("returns false for pass: variants", () => {
    expect(isGuardrailFailure("pass:no_new_unanswered_comments")).toBe(false);
    expect(isGuardrailFailure("pass:existing_comment_already_replied")).toBe(false);
  });

  it("returns true for error: prefix", () => {
    expect(isGuardrailFailure("error:403_not_mentioned")).toBe(true);
    expect(isGuardrailFailure("error:400")).toBe(true);
    expect(isGuardrailFailure("error:rate_limited")).toBe(true);
  });

  it("returns true for forbidden", () => {
    expect(isGuardrailFailure("forbidden")).toBe(true);
  });

  it("returns false for intentional skips like skip:troll_disengage", () => {
    expect(isGuardrailFailure("skip:troll_disengage")).toBe(false);
    expect(isGuardrailFailure("skip:low_quality")).toBe(false);
  });

  it("returns false for success (old schema normalization result)", () => {
    expect(isGuardrailFailure("success")).toBe(false);
  });
});
