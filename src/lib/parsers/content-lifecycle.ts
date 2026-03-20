import * as fs from "fs";
import * as path from "path";
import { WORKSPACE_PATH } from "../config";
import type {
  ContentLifecycleData,
  PipelineFunnelData,
  PipelineFunnelStage,
  PublishingCadenceData,
  CadenceDay,
  ContentTypeMixData,
  TypeMixEntry,
  ContentFeedback,
} from "./types";

const AUDIT_PATH = path.join(WORKSPACE_PATH, "content-engine/state/publish-audit.jsonl");
const WEIGHTS_PATH = path.join(WORKSPACE_PATH, "content-engine/state/content-type-weights.json");
const FEEDBACK_PATH = path.join(WORKSPACE_PATH, "content-engine/state/content-feedback.json");
const INTAKE_DIR = path.join(WORKSPACE_PATH, "content-engine/intake");

// --- Helpers ---

interface AuditEntry {
  job_id: string;
  content_type?: string;
  outcome?: string;
  format?: string;
  url?: string | null;
  published_at?: string;
  quarantined_at?: string;
  killed_at?: string;
  quarantine_reason?: string;
  kill_reason?: string;
  source?: string;
}

function readAuditEntries(): AuditEntry[] {
  try {
    const raw = fs.readFileSync(AUDIT_PATH, "utf-8");
    const lines = raw.split("\n").filter((l) => l.trim());
    const entries: AuditEntry[] = [];
    for (const line of lines) {
      try {
        entries.push(JSON.parse(line));
      } catch {
        // skip malformed lines
      }
    }
    return entries;
  } catch {
    return [];
  }
}

function countFilesInDir(dirPath: string): number {
  try {
    return fs.readdirSync(dirPath).filter((f) => f.endsWith(".json")).length;
  } catch {
    return 0;
  }
}

function readJsonFilesInDir(dirPath: string): Record<string, unknown>[] {
  try {
    const files = fs.readdirSync(dirPath).filter((f) => f.endsWith(".json"));
    const results: Record<string, unknown>[] = [];
    for (const f of files) {
      try {
        const raw = fs.readFileSync(path.join(dirPath, f), "utf-8");
        results.push(JSON.parse(raw));
      } catch {
        // skip unreadable files
      }
    }
    return results;
  } catch {
    return [];
  }
}

/**
 * Derive platform from format string.
 * x_post, x_thread → "x"
 * tiktok_video, tiktok → "tiktok"
 * instagram_video → "instagram"
 * youtube_shorts → "youtube"
 * Otherwise use format as-is or "unknown".
 */
function platformFromFormat(format: string | undefined): string {
  if (!format) return "unknown";
  const f = format.toLowerCase();
  if (f === "x_post" || f === "x_thread") return "x";
  if (f.startsWith("tiktok")) return "tiktok";
  if (f.startsWith("instagram")) return "instagram";
  if (f.startsWith("youtube")) return "youtube";
  if (f === "substack") return "substack";
  return f;
}

/**
 * Convert a timestamp to a Chicago-timezone date string (YYYY-MM-DD).
 */
function toChicagoDate(ts: string): string {
  try {
    return new Date(ts).toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  } catch {
    return "";
  }
}

/**
 * Get today's date in Chicago timezone.
 */
function chicagoToday(): Date {
  const now = new Date();
  const chicagoStr = now.toLocaleDateString("en-CA", { timeZone: "America/Chicago" });
  return new Date(chicagoStr + "T00:00:00");
}

// --- Funnel ---

export function parseFunnel(): PipelineFunnelData {
  const completedCount = countFilesInDir(path.join(INTAKE_DIR, "completed"));
  const rejectedCount = countFilesInDir(path.join(INTAKE_DIR, "rejected"));
  const quarantinedCount = countFilesInDir(path.join(INTAKE_DIR, "quarantined"));
  const canceledCount = countFilesInDir(path.join(INTAKE_DIR, "canceled"));
  const totalSubmitted = completedCount + rejectedCount + quarantinedCount + canceledCount;

  // Published = unique job_ids with outcome=published from audit log
  const auditEntries = readAuditEntries();
  const publishedJobIds = new Set<string>();
  for (const e of auditEntries) {
    if (e.outcome === "published" && e.job_id) {
      publishedJobIds.add(e.job_id);
    }
  }
  const publishedCount = publishedJobIds.size;

  // Rejection reasons from rejected/*.json
  const rejectionReasons: Record<string, number> = {};
  const rejectedFiles = readJsonFilesInDir(path.join(INTAKE_DIR, "rejected"));
  for (const f of rejectedFiles) {
    const reason = (f.rejection_reason ?? f.reject_reason ?? "unknown") as string;
    rejectionReasons[reason] = (rejectionReasons[reason] ?? 0) + 1;
  }

  // Quarantine reasons from quarantined/*.json + audit log
  const quarantineReasons: Record<string, number> = {};
  const quarantinedFiles = readJsonFilesInDir(path.join(INTAKE_DIR, "quarantined"));
  for (const f of quarantinedFiles) {
    const reason = (f.quarantine_reason ?? f.kill_reason ?? f.rejection_reason ?? "unknown") as string;
    quarantineReasons[reason] = (quarantineReasons[reason] ?? 0) + 1;
  }

  const conversionRate = totalSubmitted > 0 ? publishedCount / totalSubmitted : 0;

  const stages: PipelineFunnelStage[] = [
    { stage: "submitted", label: "Submitted", count: totalSubmitted, color: "#6366f1" },
    { stage: "gate_passed", label: "Gate Passed", count: completedCount, color: "#8b5cf6" },
    { stage: "published", label: "Published", count: publishedCount, color: "#22c55e" },
    { stage: "rejected", label: "Rejected", count: rejectedCount, color: "#f59e0b" },
    { stage: "quarantined", label: "Quarantined", count: quarantinedCount, color: "#ef4444" },
    { stage: "canceled", label: "Canceled", count: canceledCount, color: "#6b7280" },
  ];

  return {
    stages,
    rejectionReasons,
    quarantineReasons,
    totalSubmitted,
    conversionRate,
  };
}

// --- Cadence ---

export function parseCadence(): PublishingCadenceData {
  const auditEntries = readAuditEntries();

  // Only published entries, deduplicated by job_id+format (same job can publish to multiple formats)
  const seen = new Set<string>();
  const published: AuditEntry[] = [];
  for (const e of auditEntries) {
    if (e.outcome !== "published") continue;
    const key = `${e.job_id}|${e.format ?? ""}`;
    if (seen.has(key)) continue;
    seen.add(key);
    published.push(e);
  }

  // Group by date + platform
  const dayMap = new Map<string, CadenceDay>();
  for (const e of published) {
    const ts = e.published_at;
    if (!ts) continue;
    const date = toChicagoDate(ts);
    if (!date) continue;
    const platform = platformFromFormat(e.format);

    if (!dayMap.has(date)) {
      dayMap.set(date, { date, x: 0, tiktok: 0, instagram: 0, youtube: 0, substack: 0, total: 0 });
    }
    const day = dayMap.get(date)!;
    const platformKey = platform as keyof CadenceDay;
    if (platformKey in day && platformKey !== "date" && platformKey !== "total") {
      (day[platformKey] as number) += 1;
    }
    day.total += 1;
  }

  // Build last 30 days array, filling missing days with zeros
  const today = chicagoToday();
  const daily: CadenceDay[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().slice(0, 10);
    daily.push(
      dayMap.get(dateStr) ?? { date: dateStr, x: 0, tiktok: 0, instagram: 0, youtube: 0, substack: 0, total: 0 }
    );
  }

  // Averages
  const last7 = daily.slice(-7);
  const avgPerDay7d = last7.reduce((s, d) => s + d.total, 0) / 7;
  const avgPerDay30d = daily.reduce((s, d) => s + d.total, 0) / 30;

  // Trend: compare current 7d avg vs prior 7d avg
  const prior7 = daily.slice(-14, -7);
  const priorAvg = prior7.reduce((s, d) => s + d.total, 0) / 7;
  let trend: "up" | "flat" | "down" = "flat";
  if (priorAvg > 0) {
    const change = (avgPerDay7d - priorAvg) / priorAvg;
    if (change >= 0.1) trend = "up";
    else if (change <= -0.1) trend = "down";
  } else if (avgPerDay7d > 0) {
    trend = "up";
  }

  return {
    daily,
    avgPerDay7d: Math.round(avgPerDay7d * 100) / 100,
    avgPerDay30d: Math.round(avgPerDay30d * 100) / 100,
    trend,
  };
}

// --- Type Mix ---

export function parseTypeMix(): ContentTypeMixData {
  const auditEntries = readAuditEntries();

  // Count content types for published entries, deduplicated by job_id
  const seenJobs = new Set<string>();
  const typeCounts: Record<string, number> = {};
  let totalPublished = 0;

  for (const e of auditEntries) {
    if (e.outcome !== "published" || !e.job_id) continue;
    if (seenJobs.has(e.job_id)) continue;
    seenJobs.add(e.job_id);
    const ct = e.content_type ?? "unknown";
    typeCounts[ct] = (typeCounts[ct] ?? 0) + 1;
    totalPublished++;
  }

  // Read target weights
  let targetWeights: Record<string, number> = {};
  let updatedAt = "";
  try {
    const raw = fs.readFileSync(WEIGHTS_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (data && typeof data === "object") {
      targetWeights = data.weights ?? {};
      updatedAt = data.updated_at ?? "";
    }
  } catch {
    // weights file missing or malformed
  }

  // All content types from both actual and target
  const allTypes = new Set([...Object.keys(typeCounts), ...Object.keys(targetWeights)]);

  const entries: TypeMixEntry[] = [];
  for (const ct of allTypes) {
    const actualCount = typeCounts[ct] ?? 0;
    const actualPct = totalPublished > 0 ? actualCount / totalPublished : 0;
    const targetPct = targetWeights[ct] ?? 0;
    entries.push({
      contentType: ct,
      actualCount,
      actualPct: Math.round(actualPct * 10000) / 10000,
      targetPct,
      delta: Math.round((actualPct - targetPct) * 10000) / 10000,
    });
  }

  // Sort by actualCount descending
  entries.sort((a, b) => b.actualCount - a.actualCount);

  // Staleness
  let weightsStaleDays = 0;
  if (updatedAt) {
    const updatedDate = new Date(updatedAt);
    const now = new Date();
    weightsStaleDays = Math.floor((now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  return {
    entries,
    weightsUpdatedAt: updatedAt,
    weightsStaleDays,
  };
}

// --- Feedback ---

export function parseFeedback(): ContentFeedback | null {
  try {
    const raw = fs.readFileSync(FEEDBACK_PATH, "utf-8");
    const data = JSON.parse(raw);
    if (!data || typeof data !== "object") return null;
    return data as ContentFeedback;
  } catch {
    return null;
  }
}

// --- Main export ---

export function parseContentLifecycle(): ContentLifecycleData {
  return {
    funnel: parseFunnel(),
    cadence: parseCadence(),
    typeMix: parseTypeMix(),
    feedback: parseFeedback(),
  };
}
