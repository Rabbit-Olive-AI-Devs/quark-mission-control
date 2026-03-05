import { NextResponse } from "next/server";
import { parseAgents, parseBroadcast } from "@/lib/parsers/agents";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("agents");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json({
    agents: parseAgents(),
    broadcast: parseBroadcast(),
  });
}
