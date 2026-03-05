import { NextResponse } from "next/server";
import { parseAgents, parseBroadcast } from "@/lib/parsers/agents";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    agents: parseAgents(),
    broadcast: parseBroadcast(),
  });
}
