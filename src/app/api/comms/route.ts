import { NextResponse } from "next/server";
import { parseComms } from "@/lib/parsers/agents";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agent = searchParams.get("agent") || "neo";
  return NextResponse.json({ messages: parseComms(agent) });
}
