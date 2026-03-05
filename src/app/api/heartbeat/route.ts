import { NextResponse } from "next/server";
import { parseHeartbeat } from "@/lib/parsers/heartbeat";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parseHeartbeat());
}
