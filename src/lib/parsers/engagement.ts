import * as fs from "fs";
import * as path from "path";
import { WORKSPACE_PATH } from "../config";
import type {
  EngagementAction,
  EngagementData,
  DailyAggregate,
  GuardrailBlock,
  InboundGap,
  EngagementUnifiedKpis,
  EngagementSourceCoverage,
} from "./types";

const AUDIT_PATH = path.join(WORKSPACE_PATH, "content-engine/state/engagement-audit.jsonl");
const MODE_PATH = path.join(WORKSPACE_PATH, "content-engine/state/engagement-mode.json");
const COGNITIVE_DIR = path.join(WORKSPACE_PATH, "metrics/cognitive");
const MAX_LINES = 200;

function readLastLines(filePath: string, max: number): string[] {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n").filter((l) => l.trim());
    return lines.slice(-max);
  } catch {
    return [];
  }
}

/**
 * Normalize an audit JSONL line to an EngagementAction, handling two legacy
 * schema variants found in the real JSONL:
 *
 *   Standard:  { action, target_id, guardrail_result, ... }
 *   Health-check (lines 281-285): { result, detail } — no action or target_id
 *   Old-action  (lines 286-288): { action, target, result } — target instead of target_id,
 *                                 result instead of guardrail_result
 *
 * Returns null on parse error or empty input.
 */
export function normalizeAuditLine(line: string): EngagementAction | null {
  if (!line.trim()) return null;
  try {
    const d = JSON.parse(line);

    // Determine action: fall back to "check" for health-check entries
    const action: string = d.action ?? "check";

    // Determine targetId: standard field is target_id; legacy field is target
    const targetId: string = d.target_id ?? d.target ?? "";

    // Determine guardrailResult: standard field is guardrail_result; legacy
    // field is result. Map "success" (old schema) to "pass".
    let guardrailResult: string = d.guardrail_result ?? d.result ?? "pass";
    if (guardrailResult === "success") guardrailResult = "pass";

    return {
      timestamp: d.timestamp ?? "",
      platform: d.platform ?? "",
      action,
      targetId,
      targetAuthor: d.target_author ?? "",
      text: d.text ?? "",
      autonomous: d.autonomous ?? true,
      guardrailResult,
      source: d.source ?? "",
    };
  } catch {
    return null;
  }
}

/**
 * Deduplicate EngagementAction entries.
 *
 * The same real-world action can be logged by both "manual" and
 * "engagement_cron" sources with different timestamps but the same
 * action+platform+targetId triple. Keep the first occurrence.
 */
export function deduplicateActions(actions: EngagementAction[]): EngagementAction[] {
  const seen = new Set<string>();
  const result: EngagementAction[] = [];
  for (const a of actions) {
    const key = `${a.action}|${a.platform}|${a.targetId}`;
    if (!seen.has(key)) {
      seen.add(key);
      result.push(a);
    }
  }
  return result;
}

/**
 * Returns true if the action counts as a real social engagement (like, reply,
 * follow, comment, skip). Returns false for health-check actions ("check" or
 * "check:*") which should be excluded from the reply-rate denominator.
 */
export function isRealEngagement(action: EngagementAction): boolean {
  return action.action !== "check" && !action.action.startsWith("check:");
}

/**
 * Returns true only for genuine guardrail failures: results starting with
 * "error:" or equal to "forbidden". Intentional skips (e.g.
 * "skip:troll_disengage") and pass variants are NOT failures.
 */
export function isGuardrailFailure(guardrailResult: string): boolean {
  return guardrailResult.startsWith("error:") || guardrailResult === "forbidden";
}

function getTodayStr(): string {
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
}

function computeToday(actions: EngagementAction[]): EngagementData["today"] {
  const todayStr = getTodayStr();
  const todayActions = actions.filter((a) => a.timestamp.startsWith(todayStr));

  const byAction: Record<string, number> = {};
  const byPlatform: Record<string, number> = {};

  for (const a of todayActions) {
    byAction[a.action] = (byAction[a.action] ?? 0) + 1;
    byPlatform[a.platform] = (byPlatform[a.platform] ?? 0) + 1;
  }

  return { total: todayActions.length, byAction, byPlatform };
}

function computeTrends(actions: EngagementAction[]): DailyAggregate[] {
  const dayMap = new Map<string, EngagementAction[]>();

  for (const a of actions) {
    // Convert UTC timestamp to Chicago date to avoid date-shift (e.g., 10 PM CT = Mar 17 UTC)
    const date = new Date(a.timestamp).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
    if (!dayMap.has(date)) dayMap.set(date, []);
    dayMap.get(date)!.push(a);
  }

  const sorted = [...dayMap.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 7);

  return sorted
    .map(([date, dayActions]) => {
      const byPlatform: Record<string, number> = {};
      const byAction: Record<string, number> = {};
      let blocks = 0;

      for (const a of dayActions) {
        byPlatform[a.platform] = (byPlatform[a.platform] ?? 0) + 1;
        byAction[a.action] = (byAction[a.action] ?? 0) + 1;
        if (isGuardrailFailure(a.guardrailResult)) blocks++;
      }

      return { date, total: dayActions.length, byPlatform, byAction, blocks };
    })
    .reverse();
}

function extractBlocks(actions: EngagementAction[]): GuardrailBlock[] {
  return actions
    .filter((a) => isGuardrailFailure(a.guardrailResult))
    .map((a) => ({
      timestamp: a.timestamp,
      platform: a.platform,
      action: a.action,
      reason: a.guardrailResult,
      targetAuthor: a.targetAuthor || undefined,
    }));
}

function readEngagementMode(): "autonomous" | "approval_required" {
  try {
    const raw = fs.readFileSync(MODE_PATH, "utf-8");
    const data = JSON.parse(raw);
    return data.mode === "approval_required" ? "approval_required" : "autonomous";
  } catch {
    return "autonomous";
  }
}

function readInboundGap(): InboundGap {
  const empty: InboundGap = {
    totalReceived: 0,
    totalReplied: 0,
    replyRate: 0,
    byPlatform: {},
    unansweredCount: 0,
    dataDate: "",
  };

  try {
    const files = fs
      .readdirSync(COGNITIVE_DIR)
      .filter((f) => f.endsWith(".json"))
      .sort()
      .reverse();

    if (files.length === 0) return empty;

    const latest = fs.readFileSync(path.join(COGNITIVE_DIR, files[0]), "utf-8");
    const data = JSON.parse(latest);
    const e = data.engagement || {};
    const date = data.date || files[0].replace(".json", "");

    const totalReceived = e.total_received ?? 0;
    const totalReplied = e.total_replied ?? 0;

    const byPlatform: Record<string, { received: number; replied: number }> = {};
    const platforms = ["x", "tiktok", "youtube", "instagram", "substack"];
    for (const p of platforms) {
      const replied = e[`${p}_replies`] ?? 0;
      byPlatform[p] = { received: 0, replied };
    }

    return {
      totalReceived,
      totalReplied,
      replyRate: e.reply_rate ?? (totalReceived > 0 ? totalReplied / totalReceived : 0),
      byPlatform,
      unansweredCount: Math.max(0, totalReceived - totalReplied),
      dataDate: date,
    };
  } catch {
    return empty;
  }
}

function computeUnifiedKpis(actions: EngagementAction[], inboundGap: InboundGap): EngagementUnifiedKpis {
  // Exclude check actions from interaction counts — they are health checks, not real engagement
  const realActions = actions.filter(isRealEngagement);
  const totalInteractions = realActions.length;
  const impressions = inboundGap.totalReceived;
  const engagementRate = impressions > 0 ? totalInteractions / impressions : 0;

  const repliesSent = realActions.filter((a) => a.action === "reply").length;
  const reach = impressions;

  return {
    visibility: {
      impressions,
      reach,
    },
    engagement: {
      totalInteractions,
      engagementRate,
    },
    responsiveness: {
      repliesSent,
      unansweredCount: inboundGap.unansweredCount,
      replyRate: inboundGap.replyRate,
    },
    growth: {
      followerDelta: 0,
    },
    conversion: {
      linkClicks: 0,
      ctr: 0,
    },
  };
}

function computeSourceCoverage(): EngagementSourceCoverage {
  return {
    chandler: fs.existsSync(COGNITIVE_DIR),
    genviral: fs.existsSync(path.join(WORKSPACE_PATH, "content-engine/state/publish-jobs")),
    engagementAudit: fs.existsSync(AUDIT_PATH),
  };
}

export function parseEngagement(): EngagementData {
  const lines = readLastLines(AUDIT_PATH, MAX_LINES);
  const rawActions: EngagementAction[] = [];
  for (const line of lines) {
    const a = normalizeAuditLine(line);
    if (a) rawActions.push(a);
  }

  // Deduplicate before sorting: first occurrence wins
  const actions = deduplicateActions(rawActions);

  actions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  const inboundGap = readInboundGap();

  return {
    actions,
    today: computeToday(actions),
    trends: computeTrends(actions),
    guardrailBlocks: extractBlocks(actions),
    inboundGap,
    mode: readEngagementMode(),
    unifiedKpis: computeUnifiedKpis(actions, inboundGap),
    sourceCoverage: computeSourceCoverage(),
  };
}
