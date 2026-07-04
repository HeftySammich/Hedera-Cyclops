import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { jsonError } from '@/lib/api';
import { emitPostDeleted } from '@/lib/socket';

const AUTHOR_SELECT = {
  select: { id: true, username: true, walletAddress: true, pfpSerial: true },
} as const;

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  const post = await prisma.post.findUnique({
    where: { id: params.id },
    include: { author: AUTHOR_SELECT, _count: { select: { likes: true } } },
  });
  if (!post || post.deletedAt) return jsonError('Post not found.', 404);

  const replies = await prisma.post.findMany({
    where: { parentId: params.id },
    orderBy: { createdAt: 'asc' },
    include: { author: AUTHOR_SELECT, _count: { select: { likes: true } } },
  });

  return NextResponse.json({ post, replies });
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(request);
  if (!user) return jsonError('Sign in with your wallet first.', 401);

  const post = await prisma.post.findUnique({ where: { id: params.id } });
  if (!post || post.deletedAt) return jsonError('Post not found.', 404);
  if (post.authorId !== user.id && !user.isAdmin) {
    return jsonError('You can only delete your own posts.', 403);
  }

  // Soft delete so replies keep a valid parent and thread structure survives.
  const deleted = await prisma.post.update({
    where: { id: params.id },
    data: { deletedAt: new Date(), body: '', imageUrls: [] },
  });

  emitPostDeleted({ id: deleted.id, parentId: deleted.parentId });
  return NextResponse.json({ ok: true });
}
