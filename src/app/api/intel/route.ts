import { NextResponse } from "next/server";
import { parseIntel } from "@/lib/parsers/intel";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date") || undefined;

  if (isRemote() && !date) {
    const data = await getSnapshotSection("intel");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseIntel(date));
}
