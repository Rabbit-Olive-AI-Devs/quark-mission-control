import { NextResponse } from "next/server";
import { parseDigest } from "@/lib/parsers/digest";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("digest");
    if (data) return NextResponse.json(data);
  }
  return NextResponse.json({ sections: parseDigest() });
}
