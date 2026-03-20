import { NextResponse } from 'next/server';
import { parsePostPerformance } from '@/lib/parsers/post-performance';

export const dynamic = 'force-dynamic';

export async function GET() {
  const data = parsePostPerformance();
  if (!data) {
    return NextResponse.json({ error: 'No data available' }, { status: 404 });
  }
  return NextResponse.json(data);
}
