import { NextResponse } from "next/server";
import { getSourceMeta } from "@/lib/data-source";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(getSourceMeta());
}
