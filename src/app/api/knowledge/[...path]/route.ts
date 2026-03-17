import { NextRequest, NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { WORKSPACE_PATH } from "@/lib/config";

export const dynamic = "force-dynamic";

const ALLOWED_ROOTS = ["memory", "shared/knowledge-base"];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const segments = (await params).path;
  const filePath = segments.join("/");

  // Validate path is under allowed roots
  const isAllowed = ALLOWED_ROOTS.some((root) => filePath.startsWith(root));
  if (!isAllowed) {
    return NextResponse.json({ error: "Forbidden path" }, { status: 403 });
  }

  // Block directory traversal
  if (filePath.includes("..") || filePath.includes("~")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const fullPath = path.join(WORKSPACE_PATH, filePath);

  try {
    const content = fs.readFileSync(fullPath, "utf-8");
    return NextResponse.json({ path: filePath, content });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
