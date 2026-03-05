import { NextResponse } from "next/server";
import { listMemoryFiles, readMemoryFile } from "@/lib/parsers/memory";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  // File content reading only works locally
  if (slug) {
    const file = readMemoryFile(slug);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(file);
  }

  if (isRemote()) {
    const data = await getSnapshotSection("memory");
    if (data) return NextResponse.json(data);
  }

  return NextResponse.json({ files: listMemoryFiles() });
}
