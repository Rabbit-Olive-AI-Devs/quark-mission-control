import { NextResponse } from "next/server"
import { parsePipelineData } from "@/lib/parsers/pipeline"
import { isRemote, getSnapshotSection } from "@/lib/data-source"

export const dynamic = "force-dynamic"

export async function GET() {
  if (isRemote()) {
    const data = await getSnapshotSection("pipeline")
    if (data) return NextResponse.json(data)
  }

  const data = parsePipelineData()
  return NextResponse.json(data)
}
