import * as fs from "fs";
import * as path from "path";
import { WORKSPACE_PATH } from "../config";
import type {
  EngagementAction,
  EngagementData,
  DailyAggregate,
  GuardrailBlock,
  InboundGap,
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

function parseAuditLine(line: string): EngagementAction | null {
  try {
    const d = JSON.parse(line);
    return {
      timestamp: d.timestamp ?? "",
      platform: d.platform ?? "",
      action: d.action ?? "",
      targetId: d.target_id ?? "",
      targetAuthor: d.target_author ?? "",
      text: d.text ?? "",
      autonomous: d.autonomous ?? true,
      guardrailResult: d.guardrail_result ?? "pass",
      source: d.source ?? "",
    };
  } catch {
    return null;
  }
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
    const date = a.timestamp.slice(0, 10);
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
        if (a.guardrailResult !== "pass") blocks++;
      }

      return { date, total: dayActions.length, byPlatform, byAction, blocks };
    })
    .reverse();
}

function extractBlocks(actions: EngagementAction[]): GuardrailBlock[] {
  return actions
    .filter((a) => a.guardrailResult !== "pass")
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

export function parseEngagement(): EngagementData {
  const lines = readLastLines(AUDIT_PATH, MAX_LINES);
  const actions: EngagementAction[] = [];
  for (const line of lines) {
    const a = parseAuditLine(line);
    if (a) actions.push(a);
  }

  actions.sort((a, b) => b.timestamp.localeCompare(a.timestamp));

  return {
    actions,
    today: computeToday(actions),
    trends: computeTrends(actions),
    guardrailBlocks: extractBlocks(actions),
    inboundGap: readInboundGap(),
    mode: readEngagementMode(),
  };
}
