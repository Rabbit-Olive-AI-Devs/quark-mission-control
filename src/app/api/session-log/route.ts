import { NextResponse } from "next/server";
import { parseSessionLog } from "@/lib/parsers/session-log";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  // On remote, only today's session log is in the snapshot
  if (isRemote() && !date) {
    const data = await getSnapshotSection<{ entries: unknown[] }>("sessionLog");
    if (data) return NextResponse.json(data);
  }

  return NextResponse.json({ entries: parseSessionLog(date) });
}
