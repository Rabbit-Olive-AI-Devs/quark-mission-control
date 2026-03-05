import { NextResponse } from "next/server";
import { parsePending } from "@/lib/parsers/pending";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("pending");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parsePending());
}
