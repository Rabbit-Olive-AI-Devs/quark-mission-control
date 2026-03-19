import { NextResponse } from "next/server";
import { listKnowledgeFiles, readKnowledgeFile } from "@/lib/parsers/knowledge";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");

  if (slug) {
    const file = readKnowledgeFile(slug);
    if (!file) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(file);
  }

  return NextResponse.json({ files: listKnowledgeFiles() });
}
