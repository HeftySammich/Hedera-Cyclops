import { NextResponse } from 'next/server';
import { getHomeMetrics } from '@/lib/hedera-metrics';

export const dynamic = 'force-dynamic';

export async function GET() {
  const metrics = await getHomeMetrics();
  return NextResponse.json(metrics);
}
