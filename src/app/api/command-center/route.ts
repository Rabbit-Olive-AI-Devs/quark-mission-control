import { NextResponse } from "next/server";
import { parseCommandCenter } from "@/lib/parsers/command-center";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parseCommandCenter());
}
