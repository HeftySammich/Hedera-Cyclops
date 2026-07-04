import crypto from 'crypto';
import { prisma } from './prisma';
import { getAccountPublicKey } from './mirror-node';
import { buildSignInMessage, verifyHederaSignature } from './hedera-sig';

const NONCE_TTL_MS = 5 * 60_000; // 5 minutes to complete the sign-in challenge

export async function createAuthNonce(walletAddress: string) {
  const nonce = crypto.randomBytes(16).toString('hex');
  const record = await prisma.authNonce.create({
    data: {
      walletAddress,
      nonce,
      expiresAt: new Date(Date.now() + NONCE_TTL_MS),
    },
  });
  const message = buildSignInMessage({
    accountId: walletAddress,
    nonce,
    issuedAt: record.createdAt.toISOString(),
  });
  return { nonce, message };
}

export type VerifyNonceResult =
  | { ok: true }
  | { ok: false; reason: 'not_found' | 'expired' | 'account_mismatch' | 'bad_signature' | 'no_public_key' };

/** Verify the signed challenge and consume the nonce (one-time use). */
export async function verifyAndConsumeNonce(
  accountId: string,
  nonce: string,
  signature: string
): Promise<VerifyNonceResult> {
  const record = await prisma.authNonce.findUnique({ where: { nonce } });
  if (!record) return { ok: false, reason: 'not_found' };
  if (record.walletAddress !== accountId) {
    return { ok: false, reason: 'account_mismatch' };
  }
  if (record.expiresAt.getTime() < Date.now()) {
    await prisma.authNonce.delete({ where: { id: record.id } }).catch(() => undefined);
    return { ok: false, reason: 'expired' };
  }

  const accountKey = await getAccountPublicKey(accountId);
  if (!accountKey) return { ok: false, reason: 'no_public_key' };

  const message = buildSignInMessage({
    accountId,
    nonce,
    issuedAt: record.createdAt.toISOString(),
  });
  const valid = verifyHederaSignature(accountKey, message, signature);

  // One-time use regardless of outcome, to prevent replay attempts.
  await prisma.authNonce.delete({ where: { id: record.id } }).catch(() => undefined);

  if (!valid) return { ok: false, reason: 'bad_signature' };
  return { ok: true };
}

/** Delete expired nonces. Safe to call opportunistically on each request. */
export async function pruneExpiredNonces(): Promise<void> {
  await prisma.authNonce.deleteMany({ where: { expiresAt: { lt: new Date() } } });
}
