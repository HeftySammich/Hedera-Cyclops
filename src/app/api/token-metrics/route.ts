import { NextResponse } from 'next/server';
import { getTokenMetrics } from '@/lib/token-metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const metrics = await getTokenMetrics();
  return NextResponse.json({ metrics });
}
