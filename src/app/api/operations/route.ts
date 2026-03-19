import { NextResponse } from "next/server";
import { parseOperations } from "@/lib/parsers/operations";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(parseOperations());
}
