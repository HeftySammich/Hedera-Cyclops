import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/session';
import { jsonError } from '@/lib/api';

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const user = await getSessionUser(request);
  if (!user) return jsonError('Sign in with your wallet first.', 401);

  const event = await prisma.wallEvent.findUnique({ where: { id: params.id } });
  if (!event) return jsonError('Event not found.', 404);
  if (event.ownerId !== user.id && !user.isAdmin) {
    return jsonError('You can only remove your own events.', 403);
  }

  await prisma.wallEvent.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
