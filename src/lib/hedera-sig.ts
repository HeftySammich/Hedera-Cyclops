import { PublicKey } from '@hashgraph/sdk';
import { verifyMessageSignature } from '@hashgraph/hedera-wallet-connect';
import type { MirrorAccountKey } from './mirror-node';

/**
 * Verify a message signature against a Hedera account's public key, as
 * reported by the Mirror Node. Supports both ED25519 and ECDSA_SECP256K1
 * single keys. Threshold/keylist accounts are not supported for sign-in
 * (rare for holder wallets) and will fail closed.
 *
 * `signatureMapBase64` is the base64-encoded `proto.SignatureMap` string
 * returned by a wallet's `hedera_signMessage` WalletConnect call (the
 * `signatureMap` field of `SignMessageResult`) — NOT a raw signature. We
 * delegate the actual protobuf parsing + verification to
 * `@hashgraph/hedera-wallet-connect`'s `verifyMessageSignature`, which also
 * applies the same message-prefixing wallets use before signing, so this
 * only works when the connecting wallet implements that same convention
 * (HashPack and Kabila both do via hedera-wallet-connect). The PublicKey
 * instance is cast across a differently-resolved copy of the Hedera SDK
 * pulled in transitively by hedera-wallet-connect (`@hiero-ledger/sdk`) —
 * `verify()` is duck-typed and behaves identically either way, but this
 * MUST still be manually QA'd against real wallets — see README "Testing".
 */
export function verifyHederaSignature(
  accountKey: MirrorAccountKey,
  message: string,
  signatureMapBase64: string
): boolean {
  if (!accountKey?.key) return false;
  try {
    const publicKey = PublicKey.fromString(accountKey.key);
    return verifyMessageSignature(
      message,
      signatureMapBase64,
      publicKey as unknown as Parameters<typeof verifyMessageSignature>[2]
    );
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
