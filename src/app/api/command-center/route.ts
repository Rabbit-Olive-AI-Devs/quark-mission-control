import { NextResponse } from "next/server";
import { parseCommandCenter } from "@/lib/parsers/command-center";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("commandCenter");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseCommandCenter());
}
