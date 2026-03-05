import { NextResponse } from "next/server";
import { parseComms } from "@/lib/parsers/agents";
import { isRemote, getSnapshotSection } from "@/lib/data-source";
import type { CommsMessage } from "@/lib/parsers/types";

export const dynamic = "force-dynamic";

interface SnapshotAgents {
  comms?: Record<string, CommsMessage[]>;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get("agent") || "neo";

  if (isRemote()) {
    const data = await getSnapshotSection<SnapshotAgents>("agents");
    if (data?.comms) {
      const messages = data.comms[agent.toLowerCase()] || [];
      return NextResponse.json({ messages });
    }
  }

  return NextResponse.json({ messages: parseComms(agent) });
}
