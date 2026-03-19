import { NextResponse } from "next/server"
import { parsePipelineData } from "@/lib/parsers/pipeline"

export const dynamic = "force-dynamic"

export async function GET() {
  return NextResponse.json(parsePipelineData())
}
