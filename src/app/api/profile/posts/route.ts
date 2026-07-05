import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/session';
import { gateError } from '@/lib/api';

const AUTHOR_SELECT = {
  select: { id: true, username: true, walletAddress: true, pfpSerial: true },
} as const;

export async function GET(request: NextRequest) {
  const gate = await requireAuth(request);
  if (!gate.ok) return gateError(gate);

  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') ?? undefined;
  const take = Math.min(Number(searchParams.get('limit') ?? '20') || 20, 50);

  const posts = await prisma.post.findMany({
    where: { authorId: gate.user.id, deletedAt: null },
    orderBy: { createdAt: 'desc' },
    take,
    ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
    include: {
      author: AUTHOR_SELECT,
      _count: { select: { likes: true, replies: true } },
    },
  });

  return NextResponse.json({
    posts,
    nextCursor: posts.length === take ? posts[posts.length - 1].id : null,
  });
}
