import { NextResponse } from "next/server";
import { parseIntel } from "@/lib/parsers/intel";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("intel");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseIntel());
}
