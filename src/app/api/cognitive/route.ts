import { NextResponse } from "next/server";
import { parseCognitive } from "@/lib/parsers/cognitive";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("cognitive");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseCognitive());
}
