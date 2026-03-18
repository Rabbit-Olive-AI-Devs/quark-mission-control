import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/content-performance/audit-log";
import { contentPerformanceService, loadServiceSources } from "@/lib/content-performance/service";

export const dynamic = "force-dynamic";

export async function GET(_request: NextRequest) {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(_request: NextRequest) {
  const now = new Date();
  const dto = contentPerformanceService.refreshNow(loadServiceSources(), now);

  appendAuditEvent({
    timestamp: now.toISOString(),
    eventType: "ingest_run",
    scoreVersion: "v1",
    parserVersion: "p1",
    details: "Manual refresh triggered via API",
    actor: "operator",
  });

  return NextResponse.json({
    status: "ok",
    refreshedAt: dto.meta.refreshedAt,
    lastSuccessAt: dto.meta.lastSuccessAt,
    stale: dto.meta.stale,
  });
}
