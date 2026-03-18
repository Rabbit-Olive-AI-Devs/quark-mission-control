import { appendFileSync, existsSync, readFileSync } from "node:fs";
import path from "node:path";
import type { ScoreVersion } from "@/lib/content-performance/types";

export type AuditEventType =
  | "ingest_run"
  | "parser_change"
  | "schema_change"
  | "score_version_change"
  | "backfill"
  | "migration"
  | "error";

export interface ContentPerformanceAuditEvent {
  timestamp: string;
  eventType: AuditEventType;
  scoreVersion: ScoreVersion;
  parserVersion: string;
  details: string;
  actor: string;
}

const DEFAULT_AUDIT_LOG_PATH = path.resolve(process.cwd(), "data/content-performance-audit.jsonl");

const ALLOWED_EVENT_TYPES: ReadonlySet<AuditEventType> = new Set([
  "ingest_run",
  "parser_change",
  "schema_change",
  "score_version_change",
  "backfill",
  "migration",
  "error",
]);

export function validateAuditEvent(value: unknown): asserts value is ContentPerformanceAuditEvent {
  const row = value as Record<string, unknown>;
  const validDate = typeof row.timestamp === "string" && !Number.isNaN(new Date(row.timestamp).getTime());
  const validType = typeof row.eventType === "string" && ALLOWED_EVENT_TYPES.has(row.eventType as AuditEventType);
  const validScoreVersion = typeof row.scoreVersion === "string" && /^v\d+$/.test(row.scoreVersion);
  const validParserVersion = typeof row.parserVersion === "string" && row.parserVersion.trim() !== "";
  const validDetails = typeof row.details === "string" && row.details.trim() !== "";
  const validActor = typeof row.actor === "string" && row.actor.trim() !== "";

  if (!(validDate && validType && validScoreVersion && validParserVersion && validDetails && validActor)) {
    throw new Error("Invalid audit event schema");
  }
}

export function appendAuditEvent(event: ContentPerformanceAuditEvent, filePath = DEFAULT_AUDIT_LOG_PATH): void {
  validateAuditEvent(event);
  appendFileSync(filePath, `${JSON.stringify(event)}\n`, "utf8");
}

export function readAuditEvents(filePath = DEFAULT_AUDIT_LOG_PATH): ContentPerformanceAuditEvent[] {
  if (!existsSync(filePath)) {
    return [];
  }

  const content = readFileSync(filePath, "utf8");
  const rows = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => JSON.parse(line) as unknown);

  rows.forEach((row) => validateAuditEvent(row));

  return (rows as ContentPerformanceAuditEvent[]).sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
