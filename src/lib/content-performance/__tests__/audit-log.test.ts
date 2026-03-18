import { describe, expect, it } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  appendAuditEvent,
  readAuditEvents,
  validateAuditEvent,
  type ContentPerformanceAuditEvent,
} from "@/lib/content-performance/audit-log";

describe("audit log", () => {
  it("enforces append-only behavior", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cp-audit-"));
    const file = path.join(dir, "audit.jsonl");

    const first: ContentPerformanceAuditEvent = {
      timestamp: "2026-03-18T10:00:00.000Z",
      eventType: "ingest_run",
      scoreVersion: "v1",
      parserVersion: "p1",
      details: "Initial ingest",
      actor: "system",
    };

    const second: ContentPerformanceAuditEvent = {
      timestamp: "2026-03-18T10:01:00.000Z",
      eventType: "backfill",
      scoreVersion: "v1",
      parserVersion: "p1",
      details: "Auto 30d backfill",
      actor: "system",
    };

    appendAuditEvent(first, file);
    const afterFirst = readFileSync(file, "utf8");
    appendAuditEvent(second, file);
    const afterSecond = readFileSync(file, "utf8");

    expect(afterSecond.startsWith(afterFirst)).toBe(true);
    expect(afterSecond.trim().split(/\r?\n/)).toHaveLength(2);
  });

  it("parses stored JSONL entries newest-first", () => {
    const dir = mkdtempSync(path.join(tmpdir(), "cp-audit-"));
    const file = path.join(dir, "audit.jsonl");

    writeFileSync(
      file,
      [
        JSON.stringify({
          timestamp: "2026-03-18T09:00:00.000Z",
          eventType: "ingest_run",
          scoreVersion: "v1",
          parserVersion: "p1",
          details: "older",
          actor: "system",
        }),
        JSON.stringify({
          timestamp: "2026-03-18T10:00:00.000Z",
          eventType: "score_version_change",
          scoreVersion: "v2",
          parserVersion: "p2",
          details: "newer",
          actor: "operator",
        }),
      ].join("\n") + "\n",
      "utf8"
    );

    const rows = readAuditEvents(file);

    expect(rows).toHaveLength(2);
    expect(rows[0].details).toBe("newer");
    expect(rows[1].details).toBe("older");
  });

  it("rejects invalid event schema", () => {
    expect(() =>
      validateAuditEvent({
        timestamp: "not-a-date",
        eventType: "invalid",
      })
    ).toThrow(/invalid audit event schema/i);
  });
});
