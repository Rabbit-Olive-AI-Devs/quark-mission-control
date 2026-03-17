import { NextResponse } from "next/server";
import { listKnowledgeFiles, readKnowledgeFile } from "@/lib/parsers/knowledge";
import { isRemote, getSnapshotSection } from "@/lib/data-source";

export const dynamic = "force-dynamic";

const SNAPSHOT_URL = process.env.SNAPSHOT_URL;
const SNAPSHOT_API_KEY = process.env.SNAPSHOT_API_KEY;

interface SnapshotKnowledge {
  files: { name: string; path: string; size: number; modified: string; category: string; content?: string }[];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (isRemote()) {
    // For individual file content: proxy to MacBook API (snapshot has metadata only)
    if (slug && SNAPSHOT_URL) {
      try {
        const baseUrl = SNAPSHOT_URL.replace(/\/api\/snapshot\/?$/, "");
        const headers: Record<string, string> = {};
        if (SNAPSHOT_API_KEY) headers["Authorization"] = `Bearer ${SNAPSHOT_API_KEY}`;
        const res = await fetch(
          `${baseUrl}/api/knowledge?slug=${encodeURIComponent(slug)}`,
          { headers, cache: "no-store" }
        );
        if (res.ok) {
          const json = await res.json();
          return NextResponse.json(json);
        }
      } catch {
        // Fall through to snapshot lookup
      }
    }

    // For file listing: use cached snapshot
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
