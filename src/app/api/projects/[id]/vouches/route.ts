import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireHolder } from '@/lib/session';
import { createVouchSchema } from '@/lib/validation';
import { jsonError, zodError, gateError, rateLimitError } from '@/lib/api';
import { checkRateLimit } from '@/lib/ratelimit';
import { sanitizePlainText } from '@/lib/sanitize';

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const rl = checkRateLimit(gate.user.walletAddress, 'vouch');
  if (!rl.allowed) return rateLimitError(rl.retryAfterMs);

  const body = await request.json().catch(() => ({}));
  const parsed = createVouchSchema.safeParse({ ...body, projectId: params.id });
  if (!parsed.success) return zodError(parsed.error);

  const project = await prisma.project.findUnique({ where: { id: params.id } });
  if (!project) return jsonError('Project not found.', 404);
  if (project.submittedById === gate.user.id) {
    return jsonError('You cannot vouch for your own project.', 400);
  }

  try {
    const vouch = await prisma.vouch.create({
      data: {
        projectId: params.id,
        voucherId: gate.user.id,
        comment: parsed.data.comment ? sanitizePlainText(parsed.data.comment, 500) : null,
      },
    });
    return NextResponse.json({ vouch }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return jsonError('You already vouched for this project.', 409);
    }
    throw err;
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  await prisma.vouch.deleteMany({
    where: { projectId: params.id, voucherId: gate.user.id },
  });
  return NextResponse.json({ ok: true });
}
