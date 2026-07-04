import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireHolder } from '@/lib/session';
import { createPostSchema } from '@/lib/validation';
import { jsonError, zodError, gateError, rateLimitError } from '@/lib/api';
import { sanitizeBody } from '@/lib/sanitize';
import { checkRateLimit } from '@/lib/ratelimit';
import { emitPostCreated } from '@/lib/socket';

const AUTHOR_SELECT = {
  select: { id: true, username: true, walletAddress: true, pfpSerial: true },
} as const;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const cursor = searchParams.get('cursor') ?? undefined;
  const take = Math.min(Number(searchParams.get('limit') ?? '20') || 20, 50);

  const posts = await prisma.post.findMany({
    where: { parentId: null, deletedAt: null },
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

export async function POST(request: NextRequest) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const rl = checkRateLimit(gate.user.walletAddress, 'post');
  if (!rl.allowed) return rateLimitError(rl.retryAfterMs);

  const body = await request.json().catch(() => null);
  const parsed = createPostSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  if (parsed.data.parentId) {
    const parent = await prisma.post.findUnique({ where: { id: parsed.data.parentId } });
    if (!parent || parent.deletedAt) return jsonError('Parent post not found.', 404);
  }

  const post = await prisma.post.create({
    data: {
      authorId: gate.user.id,
      body: sanitizeBody(parsed.data.body),
      imageUrls: parsed.data.imageUrls,
      parentId: parsed.data.parentId ?? null,
    },
    include: { author: AUTHOR_SELECT, _count: { select: { likes: true, replies: true } } },
  });

  emitPostCreated({
    id: post.id,
    parentId: post.parentId,
    authorId: post.authorId,
    body: post.body,
    imageUrls: post.imageUrls,
    createdAt: post.createdAt.toISOString(),
  });

  return NextResponse.json({ post }, { status: 201 });
}
