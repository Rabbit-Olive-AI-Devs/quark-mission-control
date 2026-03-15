import { NextResponse } from "next/server";
import { parseEngagement } from "@/lib/parsers/engagement";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("engagement");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseEngagement());
}
