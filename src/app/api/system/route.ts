import { NextResponse } from "next/server";
import { getSystemInfo } from "@/lib/parsers/system";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("system");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(getSystemInfo());
}
