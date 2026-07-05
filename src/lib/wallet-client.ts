'use client';

import { env } from './env';

// Thin, lazily-initialized wrapper around @hashgraph/hedera-wallet-connect's
// DAppConnector. Everything here is dynamically imported so none of the
// WalletConnect/QR-modal code (which touches `window`) ends up in the SSR
// bundle or runs before a user actually tries to connect.
//
// NOTE: the wallet-connect package pulls in its own transitive copy of the
// Hedera SDK (`@hiero-ledger/sdk`), separate from our direct `@hashgraph/sdk`
// dependency. Both are the same underlying SDK under different package
// names, and their runtime objects are interchangeable, but TypeScript sees
// them as nominally distinct classes — hence the `any`/casts below. This
// boundary is exactly where wallet quirks show up in practice, so treat this
// file as the one that needs manual QA against real wallets (HashPack,
// Kabila) before relying on it in production.

let connector: any = null;

function chainAndNetwork() {
  const network = env.publicHederaNetwork;
  return { network, chainId: network === 'mainnet' ? 'hedera:mainnet' : 'hedera:testnet' };
}

async function getConnector() {
  if (connector) return connector;
  if (!env.walletConnectProjectId) {
    throw new Error('WalletConnect is not configured (NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID).');
  }

  // Deep-import the dapp/shared subpaths instead of the package root: the
  // root barrel also re-exports a `./wallet` (Reown WalletKit) and `./reown`
  // (Reown AppKit) integration we don't use, which would otherwise pull
  // `@reown/appkit`, `@reown/walletkit`, and `ethers` into the bundle.
  const [{ DAppConnector }, { HederaJsonRpcMethod, HederaSessionEvent }, { LedgerId }] =
    await Promise.all([
      import('@hashgraph/hedera-wallet-connect/dist/lib/dapp'),
      import('@hashgraph/hedera-wallet-connect/dist/lib/shared'),
      import('@hashgraph/sdk'),
    ]);

  const { network, chainId } = chainAndNetwork();
  const ledgerId = network === 'mainnet' ? LedgerId.MAINNET : LedgerId.TESTNET;

  connector = new DAppConnector(
    {
      name: 'Hedera Cyclops',
      description: 'An anonymously developed, community-first NFT collection on Hedera.',
      url: env.appUrl,
      icons: [`${env.appUrl}/favicon.ico`],
    },
    ledgerId as any,
    env.walletConnectProjectId,
    [HederaJsonRpcMethod.SignMessage],
    [HederaSessionEvent.AccountsChanged, HederaSessionEvent.ChainChanged],
    [chainId]
  );
  await connector.init({ logger: 'error' });
  return connector;
}

function extractAccountId(session: { namespaces?: Record<string, { accounts?: string[] }> }) {
  const accounts = session.namespaces?.hedera?.accounts ?? [];
  const first = accounts[0];
  if (!first) return null;
  // Account strings look like "hedera:testnet:0.0.1234".
  return first.split(':').pop() ?? null;
}

export async function connectWallet(): Promise<string | null> {
  const c = await getConnector();
  const session = await c.openModal();
  return extractAccountId(session);
}

export async function signMessageWithWallet(
  accountId: string,
  message: string
): Promise<string> {
  const c = await getConnector();
  const { chainId } = chainAndNetwork();
  const result = await c.signMessage({
    signerAccountId: `${chainId}:${accountId}`,
    message,
  });
  return result.signatureMap;
}

export async function disconnectWallet(): Promise<void> {
  if (!connector) return;
  await connector.disconnectAll().catch(() => undefined);
}
