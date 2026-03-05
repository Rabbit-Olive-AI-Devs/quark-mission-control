import { NextResponse } from "next/server";
import { parseHeartbeat } from "@/lib/parsers/heartbeat";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("heartbeat");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseHeartbeat());
}
