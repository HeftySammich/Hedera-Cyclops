import { NextRequest, NextResponse } from 'next/server';
import { authVerifySchema } from '@/lib/validation';
import { verifyAndConsumeNonce } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { setSessionCookie } from '@/lib/session';
import { jsonError, zodError } from '@/lib/api';

const REASON_MESSAGES: Record<string, string> = {
  not_found: 'This sign-in request has expired or was already used. Try again.',
  expired: 'This sign-in request has expired. Try again.',
  account_mismatch: 'Nonce does not belong to this wallet.',
  bad_signature: 'Signature verification failed.',
  no_public_key: "Could not read this account's public key from the network.",
};

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = authVerifySchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const { walletAddress, nonce, signature } = parsed.data;
  const result = await verifyAndConsumeNonce(walletAddress, nonce, signature);
  if (!result.ok) {
    return jsonError(REASON_MESSAGES[result.reason] ?? 'Sign-in failed.', 401);
  }

  const user = await prisma.user.upsert({
    where: { walletAddress },
    update: {},
    create: { walletAddress },
  });

  const response = NextResponse.json({
    user: { id: user.id, walletAddress: user.walletAddress, username: user.username },
  });
  return setSessionCookie(response, user.id, user.walletAddress);
}
