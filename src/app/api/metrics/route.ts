import { NextResponse } from "next/server";
import { parseMetrics } from "@/lib/parsers/metrics";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("metrics");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseMetrics());
}
