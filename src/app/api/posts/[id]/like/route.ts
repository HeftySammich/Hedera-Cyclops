import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireHolder } from '@/lib/session';
import { jsonError, gateError, rateLimitError } from '@/lib/api';
import { checkRateLimit } from '@/lib/ratelimit';
import { emitLikeChanged } from '@/lib/socket';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const rl = checkRateLimit(gate.user.walletAddress, 'like');
  if (!rl.allowed) return rateLimitError(rl.retryAfterMs);

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || post.deletedAt) return jsonError('Post not found.', 404);

  const existing = await prisma.like.findUnique({
    where: { userId_postId: { userId: gate.user.id, postId: params.id } },
  });

  if (existing) {
    await prisma.like.delete({ where: { id: existing.id } });
  } else {
    await prisma.like.create({ data: { userId: gate.user.id, postId: params.id } });
  }

  const likeCount = await prisma.like.count({ where: { postId: params.id } });
  emitLikeChanged({ postId: params.id, likeCount }, post.parentId);

  return NextResponse.json({ liked: !existing, likeCount });
}
