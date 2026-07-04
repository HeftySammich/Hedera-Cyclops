import { PublicKey } from '@hashgraph/sdk';
import type { MirrorAccountKey } from './mirror-node';

/**
 * Verify a message signature against a Hedera account's public key, as
 * reported by the Mirror Node. Supports both ED25519 and ECDSA_SECP256K1
 * single keys. Threshold/keylist accounts are not supported for sign-in
 * (rare for holder wallets) and will fail closed.
 *
 * NOTE: exact byte-encoding of the signed message can differ slightly by
 * wallet (HashPack vs Kabila). This has been implemented against the
 * documented WalletConnect `hedera_signMessage` contract (UTF-8 message
 * bytes, raw signature bytes) but MUST be manually QA'd against both real
 * wallets before relying on it in production — see README "Testing".
 */
export function verifyHederaSignature(
  accountKey: MirrorAccountKey,
  message: string,
  signatureBase64: string
): boolean {
  if (!accountKey?.key) return false;
  try {
    const publicKey = PublicKey.fromString(accountKey.key);
    const messageBytes = Buffer.from(message, 'utf-8');
    const signatureBytes = Buffer.from(signatureBase64, 'base64');
    return publicKey.verify(messageBytes, signatureBytes);
  } catch {
    return false;
  }
}

/** Deterministic sign-in challenge message for a given nonce. */
export function buildSignInMessage(params: {
  accountId: string;
  nonce: string;
  issuedAt: string;
}): string {
  return [
    'Hedera Cyclops — sign in to verify wallet ownership.',
    `Account: ${params.accountId}`,
    `Nonce: ${params.nonce}`,
    `Issued: ${params.issuedAt}`,
    'This request will not trigger a blockchain transaction or cost any fees.',
  ].join('\n');
}
