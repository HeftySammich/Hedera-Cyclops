import { NextRequest, NextResponse } from 'next/server';
import { authNonceSchema } from '@/lib/validation';
import { createAuthNonce, pruneExpiredNonces } from '@/lib/auth';
import { jsonError, zodError } from '@/lib/api';
import { checkRateLimit } from '@/lib/ratelimit';

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = authNonceSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);

  const rl = checkRateLimit(parsed.data.walletAddress, 'profile');
  if (!rl.allowed) return jsonError('Too many nonce requests, try again shortly.', 429);

  await pruneExpiredNonces();
  const { nonce, message } = await createAuthNonce(parsed.data.walletAddress);
  return NextResponse.json({ nonce, message });
}
