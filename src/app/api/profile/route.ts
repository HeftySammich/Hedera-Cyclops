import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { requireHolder } from '@/lib/session';
import { updateProfileSchema } from '@/lib/validation';
import { jsonError, zodError, gateError, rateLimitError } from '@/lib/api';
import { checkRateLimit } from '@/lib/ratelimit';
import { getOwnedSerialsForWallet } from '@/lib/nft';

export async function PATCH(request: NextRequest) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const rl = checkRateLimit(gate.user.walletAddress, 'profile');
  if (!rl.allowed) return rateLimitError(rl.retryAfterMs);

  const body = await request.json().catch(() => null);
  const parsed = updateProfileSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const { username, pfpSerial } = parsed.data;

  if (pfpSerial != null) {
    const owned = await getOwnedSerialsForWallet(gate.user.walletAddress);
    if (!owned.some((o) => o.serial === pfpSerial)) {
      return jsonError('You do not own that Cyclops serial.', 403);
    }
  }

  try {
    const user = await prisma.user.update({
      where: { id: gate.user.id },
      data: {
        ...(username !== undefined ? { username } : {}),
        ...(pfpSerial !== undefined ? { pfpSerial } : {}),
      },
    });
    return NextResponse.json({
      user: {
        id: user.id,
        walletAddress: user.walletAddress,
        username: user.username,
        pfpSerial: user.pfpSerial,
      },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      return jsonError('That username is already taken.', 409);
    }
    throw err;
  }
}
