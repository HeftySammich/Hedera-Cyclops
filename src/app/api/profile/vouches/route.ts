import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { gateError } from '@/lib/api';

export async function GET(request: NextRequest) {
  const gate = await requireAuth(request);
  if (!gate.ok) return gateError(gate);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') ?? undefined;
  const take = Math.min(Number(searchParams.get('limit') ?? '20') || 20, 50);

  const vouches = await prisma.vouch.findMany({
    where: { voucherId: gate.user.id },
    orderBy: { createdAt: 'desc' },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      project: {
        include: {
          submittedBy: {
            select: { id: true, username: true, walletAddress: true, pfpSerial: true },
          },
          _count: { select: { vouches: true } },
        },
      },
    },
  });

  return NextResponse.json({
    vouches,
    nextCursor: vouches.length === take ? vouches[vouches.length - 1].id : null,
  });
}
