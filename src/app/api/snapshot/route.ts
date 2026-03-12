import { NextResponse } from "next/server";
import { parseHeartbeat } from "@/lib/parsers/heartbeat";
import { parseDigest } from "@/lib/parsers/digest";
import { parsePending } from "@/lib/parsers/pending";
import { parseIntel } from "@/lib/parsers/intel";
import { parseMetrics } from "@/lib/parsers/metrics";
import { parseAgents, parseBroadcast, parseComms } from "@/lib/parsers/agents";
import { parseCronList } from "@/lib/parsers/cron";
import { parseSessionLog } from "@/lib/parsers/session-log";
import { parseContentLog, parseHookTracker, parseContentCalendar, parseHookLibrary } from "@/lib/parsers/content";
import { getSystemInfo } from "@/lib/parsers/system";
import { listMemoryFilesWithContent } from "@/lib/parsers/memory";
import { listKnowledgeFilesWithContent } from "@/lib/parsers/knowledge";
import { parseCommandCenter } from "@/lib/parsers/command-center";
import { parsePipelineData } from "@/lib/parsers/pipeline";
import { computeWorkspaceHash } from "@/lib/hash";
import { corsHeaders } from "@/lib/cors";

export const dynamic = "force-dynamic";

export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 204, headers: corsHeaders(request) });
}

// Single endpoint that bundles ALL dashboard data.
// Used by Vercel deployment to fetch data from the local MacBook
// via Tailscale Funnel.
export async function GET(request: Request) {
  const cors = corsHeaders(request);

  // Simple bearer token auth for the snapshot endpoint
  const authHeader = request.headers.get("authorization");
  const snapshotKey = process.env.SNAPSHOT_API_KEY;
  if (snapshotKey && authHeader !== `Bearer ${snapshotKey}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: cors });
  }

  const jobs = parseCronList();

  const snapshot = {
    timestamp: new Date().toISOString(),
    cron: {
      jobs,
      summary: {
        total: jobs.length,
        ok: jobs.filter((j) => j.status === "ok").length,
        failed: jobs.filter((j) => j.status !== "ok" && j.status !== "idle" && j.status !== "disabled" && j.status !== "unknown").length,
      },
    },
    heartbeat: parseHeartbeat(),
    digest: { sections: parseDigest() },
    pending: parsePending(),
    intel: parseIntel(),
    metrics: parseMetrics(),
    commandCenter: parseCommandCenter(),
    agents: {
      agents: parseAgents(),
      broadcast: parseBroadcast(),
      comms: {
        neo: parseComms("neo"),
        fulcrum: parseComms("fulcrum"),
        cassian: parseComms("cassian"),
        chandler: parseComms("chandler"),
      },
    },
    sessionLog: { entries: parseSessionLog() },
    content: {
      posts: parseContentLog(),
      hookCategories: parseHookTracker(),
      calendar: parseContentCalendar(),
      hookLibrary: parseHookLibrary(),
    },
    system: getSystemInfo(),
    pipeline: parsePipelineData(),
    memory: { files: listMemoryFilesWithContent() },
    knowledge: { files: listKnowledgeFilesWithContent() },
  };

  const hash = await computeWorkspaceHash();
  const snapshotWithHash = { ...snapshot, hash };

  return NextResponse.json(snapshotWithHash, {
    headers: {
      ...cors,
      "Cache-Control": "no-store",
    },
  });
}
