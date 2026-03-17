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
import { listMemoryFiles } from "@/lib/parsers/memory";
import { listKnowledgeFiles } from "@/lib/parsers/knowledge";
import { parseCommandCenter } from "@/lib/parsers/command-center";
import { parsePipelineData } from "@/lib/parsers/pipeline";
import { parseCognitive } from "@/lib/parsers/cognitive";
import { parseEngagement } from "@/lib/parsers/engagement";
import { parseOperations } from "@/lib/parsers/operations";
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

  // Run all parsers in parallel — each group resolves independently
  const [
    jobs,
    heartbeat,
    digestSections,
    pending,
    intel,
    metrics,
    commandCenter,
    agents,
    broadcast,
    sessionLogEntries,
    contentLog,
    hookCategories,
    contentCalendar,
    hookLibrary,
    system,
    pipeline,
    cognitive,
    engagement,
    operations,
    memoryFiles,
    knowledgeFiles,
    hash,
    commsNeo,
    commsFulcrum,
    commsCassian,
    commsChandler,
  ] = await Promise.all([
    Promise.resolve(parseCronList()),
    Promise.resolve(parseHeartbeat()),
    Promise.resolve(parseDigest()),
    Promise.resolve(parsePending()),
    Promise.resolve(parseIntel()),
    Promise.resolve(parseMetrics()),
    Promise.resolve(parseCommandCenter()),
    Promise.resolve(parseAgents()),
    Promise.resolve(parseBroadcast()),
    Promise.resolve(parseSessionLog()),
    Promise.resolve(parseContentLog()),
    Promise.resolve(parseHookTracker()),
    Promise.resolve(parseContentCalendar()),
    Promise.resolve(parseHookLibrary()),
    Promise.resolve(getSystemInfo()),
    Promise.resolve(parsePipelineData()),
    Promise.resolve(parseCognitive()),
    Promise.resolve(parseEngagement()),
    Promise.resolve(parseOperations()),
    Promise.resolve(listMemoryFiles()),
    Promise.resolve(listKnowledgeFiles()),
    computeWorkspaceHash(),
    Promise.resolve(parseComms("neo")),
    Promise.resolve(parseComms("fulcrum")),
    Promise.resolve(parseComms("cassian")),
    Promise.resolve(parseComms("chandler")),
  ]);

  const snapshot = {
    timestamp: new Date().toISOString(),
    hash,
    cron: {
      jobs,
      summary: {
        total: jobs.length,
        ok: jobs.filter((j) => j.status === "ok").length,
        failed: jobs.filter((j) => j.status !== "ok" && j.status !== "idle" && j.status !== "disabled" && j.status !== "unknown").length,
      },
    },
    heartbeat,
    digest: { sections: digestSections },
    pending,
    intel,
    metrics,
    commandCenter,
    agents: {
      agents,
      broadcast,
      comms: {
        neo: commsNeo,
        fulcrum: commsFulcrum,
        cassian: commsCassian,
        chandler: commsChandler,
      },
    },
    sessionLog: { entries: sessionLogEntries },
    content: {
      posts: contentLog,
      hookCategories,
      calendar: contentCalendar,
      hookLibrary,
    },
    system,
    pipeline,
    cognitive,
    engagement,
    operations,
    memory: { files: memoryFiles },
    knowledge: { files: knowledgeFiles },
  };

  return NextResponse.json(snapshot, {
    headers: {
      ...cors,
      "Cache-Control": "no-store",
    },
  });
}
