import { NextResponse } from "next/server";
import { listKnowledgeFiles, readKnowledgeFile } from "@/lib/parsers/knowledge";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

interface SnapshotKnowledge {
  files: { name: string; path: string; size: number; modified: string; category: string; content?: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (isRemote()) {
    const data = await getSnapshotSection<SnapshotKnowledge>("knowledge");
    if (data) {
      if (slug) {
        const file = data.files.find((f) => f.path === slug);
        if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
        return NextResponse.json({ content: file.content || "No content available" });
      }
      return NextResponse.json(data);
    }
  }

  if (slug) {
    const file = readKnowledgeFile(slug);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(file);
  }

  return NextResponse.json({ files: listKnowledgeFiles() });
}
