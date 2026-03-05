import { NextResponse } from "next/server";
import { listMemoryFiles, readMemoryFile } from "@/lib/parsers/memory";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

interface SnapshotMemory {
  files: { name: string; path: string; size: number; modified: string; type: string; content?: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (isRemote()) {
    const data = await getSnapshotSection<SnapshotMemory>("memory");
    if (data) {
      if (slug) {
        // Find file content from snapshot
        const file = data.files.find((f) => f.path === slug);
        if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ content: file.content || "No content available" });
      }
      return NextResponse.json(data);
    }
  }

  if (slug) {
    const file = readMemoryFile(slug);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(file);
  }

  return NextResponse.json({ files: listMemoryFiles() });
}
