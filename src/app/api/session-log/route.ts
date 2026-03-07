import { NextResponse } from "next/server";
import { parseSessionLog } from "@/lib/parsers/session-log";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "America/Chicago" });

  // On remote, use snapshot for today's data (local files don't exist on Vercel)
  if (isRemote() && (!date || date === today)) {
    const data = await getSnapshotSection<{ entries: unknown[] }>("sessionLog");
    if (data) return NextResponse.json(data);
  }

  return NextResponse.json({ entries: parseSessionLog(date) });
}
