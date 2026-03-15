import { NextResponse } from "next/server";
import { parseAgents, parseBroadcast, parseComms } from "@/lib/parsers/agents";
import { isRemote, getSnapshotSection } from "@/lib/data-source";
import type { AgentStatus, BroadcastStatus } from "@/lib/parsers/types";

export const dynamic = "force-dynamic";

function ensureMse6(payload: { agents?: AgentStatus[]; broadcast?: BroadcastStatus; comms?: Record<string, unknown> }) {
  const agents = payload.agents || [];
  const hasMse6 = agents.some((a) => (a.config?.name || "").toLowerCase().replace(/[-_\s]/g, "") === "mse6");

  if (!hasMse6) {
    agents.push({
      config: {
        name: "MSE-6",
        description: "Service droid — monitor-only infrastructure health, hygiene, and drift detection on Mac host",
        model: "unknown",
        timeoutSeconds: 300,
      },
      latestComms: "No recent activity",
      latestTimestamp: null,
      hasInbound: false,
      hasOutbound: false,
    });
  }

  return {
    ...payload,
    agents,
    comms: {
      ...(payload.comms || {}),
      mse6: (payload.comms as Record<string, unknown> | undefined)?.mse6 || [],
    },
  };
}

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("agents");
    if (data) return NextResponse.json(ensureMse6(data));
  }

  const agents = parseAgents();
  return NextResponse.json(
    ensureMse6({
      agents,
      broadcast: parseBroadcast(),
      comms: Object.fromEntries(
        agents.map((a) => [a.config.name.toLowerCase(), parseComms(a.config.name.toLowerCase())])
      ),
    })
  );
}
