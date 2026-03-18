import { NextRequest, NextResponse } from "next/server";
import { appendAuditEvent } from "@/lib/content-performance/audit-log";
import { contentPerformanceService, loadServiceSources } from "@/lib/content-performance/service";

export const dynamic = "force-dynamic";

function isAuthorized(request: NextRequest): boolean {
  const key = process.env.SNAPSHOT_API_KEY;
  if (!key) return true;
  const bearer = request.headers.get("authorization")?.replace("Bearer ", "");
  return bearer === key;
}

export async function GET() {
  return NextResponse.json({ error: "Method Not Allowed" }, { status: 405 });
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
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
  } catch {
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}
