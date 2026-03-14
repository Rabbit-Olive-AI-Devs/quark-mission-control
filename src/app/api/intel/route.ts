import { NextResponse } from "next/server";
import { parseIntel } from "@/lib/parsers/intel";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  if (isRemote()) {
    // On Vercel we have no local files — always use snapshot for intel
    const data = await getSnapshotSection("intel");
    if (data) return NextResponse.json(data);
    // Snapshot unavailable — return empty
    return NextResponse.json({ date: "", compiled: "", highSignal: [], rising: [], nicheSignals: [], suggestions: [] });
  }
  return NextResponse.json(parseIntel(date));
}
