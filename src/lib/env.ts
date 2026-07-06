// Centralized, typed access to environment configuration.
// Nothing here is hardcoded — every value comes from process.env so mint
// phases / networks / providers can change with zero code changes.

function csv(value: string | undefined): string[] {
  return (value ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export interface PhaseConfig {
  name: string;
  target: number;
}

function parsePhases(value: string | undefined): PhaseConfig[] {
  return csv(value)
    .map((entry) => {
      const [name, target] = entry.split(':').map((s) => s.trim());
      const parsed = Number(target);
      if (!name || !Number.isFinite(parsed)) return null;
      return { name, target: parsed };
    })
    .filter((p): p is PhaseConfig => p !== null);
}

export const env = {
  databaseUrl: process.env.DATABASE_URL ?? '',
  hederaNetwork: (process.env.HEDERA_NETWORK ?? 'mainnet') as 'mainnet' | 'testnet',
  // Server-only HEDERA_NETWORK isn't visible in the browser bundle; wallet
  // setup runs client-side, so it needs its own NEXT_PUBLIC_ mirror.
  publicHederaNetwork: (process.env.NEXT_PUBLIC_HEDERA_NETWORK ?? 'mainnet') as
    | 'mainnet'
    | 'testnet',
  get tokenIds(): string[] {
    return csv(process.env.HEDERA_TOKEN_IDS);
  },
  mirrorNodeBaseUrl:
    process.env.MIRROR_NODE_BASE_URL ?? 'https://mainnet-public.mirrornode.hedera.com',
  ipfsGatewayUrl: process.env.IPFS_GATEWAY_URL ?? 'https://ipfs.io',
  authJwtSecret: process.env.AUTH_JWT_SECRET ?? '',
  authCookieName: process.env.AUTH_COOKIE_NAME ?? 'hc_session',
  hgraphApiKey: process.env.HGRAPH_API_KEY ?? '',
  coingeckoApiKey: process.env.COINGECKO_API_KEY ?? '',
  mintPriceHbar: (() => {
    const n = Number(process.env.MINT_PRICE_HBAR);
    return Number.isFinite(n) && n > 0 ? n : null;
  })(),
  objectStorage: {
    endpoint: process.env.OBJECT_STORAGE_ENDPOINT ?? '',
    region: process.env.OBJECT_STORAGE_REGION ?? 'auto',
    bucket: process.env.OBJECT_STORAGE_BUCKET ?? '',
    accessKeyId: process.env.OBJECT_STORAGE_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.OBJECT_STORAGE_SECRET_ACCESS_KEY ?? '',
    publicUrl: process.env.OBJECT_STORAGE_PUBLIC_URL ?? '',
  },
  get adminWalletAddresses(): string[] {
    return csv(process.env.ADMIN_WALLET_ADDRESSES);
  },
  totalSupply: Number(process.env.TOTAL_SUPPLY ?? '3333'),
  get phases(): PhaseConfig[] {
    return parsePhases(process.env.PHASES);
  },
  get useMockNfts(): boolean {
    // Mock data is a dev/demo convenience and is only ever used when no real
    // token id has been configured yet — real config always wins.
    return process.env.USE_MOCK_NFTS === 'true' && this.tokenIds.length === 0;
  },
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  walletConnectProjectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ?? '',
};

export function isAdminWallet(walletAddress: string): boolean {
  return env.adminWalletAddresses.includes(walletAddress);
}
