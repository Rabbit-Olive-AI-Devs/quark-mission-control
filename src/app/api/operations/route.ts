import { NextResponse } from "next/server";
import { parseOperations } from "@/lib/parsers/operations";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("operations");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json(parseOperations());
}
