import { NextResponse } from "next/server";
import { searchMemoryFiles } from "@/lib/parsers/search";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q") || "";
  const limit = parseInt(searchParams.get("limit") || "50");

  if (q.length < 2) {
    return NextResponse.json({ results: [], query: q });
  }

  const results = searchMemoryFiles(q, limit);
  return NextResponse.json({ results, query: q });
}
