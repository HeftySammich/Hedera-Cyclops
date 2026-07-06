import { unstable_cache } from 'next/cache';
import { env } from './env';
import { fetchWithRetry } from './fetch-retry';

export interface TokenMetrics {
  tokenId: string;
  treasury: string | null;
  totalSupply: number | null;
  minted: number | null;
  holders: number | null;
  keys: string[];
  volume24hHbar: number | null;
  lastUpdated: string;
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function tokenIdNumeric(tokenId: string): string {
  return tokenId.split('.').pop() ?? tokenId;
}

async function getTokenInfo(tokenId: string) {
  try {
    const res = await fetchWithRetry(
      `${env.mirrorNodeBaseUrl}/api/v1/tokens/${tokenId}`,
      { headers: { accept: 'application/json' } }
    );
    if (!res.ok) return null;
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return null;
  }
}

async function getTokenHolderCount(tokenId: string): Promise<number | null> {
  try {
    let count = 0;
    let next: string | null = `${env.mirrorNodeBaseUrl}/api/v1/tokens/${tokenId}/balances?limit=1000`;
    while (next) {
      const res = await fetchWithRetry(next, { headers: { accept: 'application/json' } });
      if (!res.ok) return count || null;
      const json = (await res.json()) as {
        balances?: { account: string; balance: number | string }[];
        links?: { next: string | null };
      };
      const balances = json.balances ?? [];
      count += balances.filter((b) => Number(b.balance) > 0).length;
      const path = json.links?.next;
      next = path ? `${env.mirrorNodeBaseUrl}${path}` : null;
    }
    return count;
  } catch {
    return null;
  }
}

function tokenKeys(info: Record<string, unknown>): string[] {
  const keyMap: [string, string][] = [
    ['admin_key', 'Admin'],
    ['freeze_key', 'Freeze'],
    ['wipe_key', 'Wipe'],
    ['kyc_key', 'KYC'],
    ['pause_key', 'Pause'],
    ['supply_key', 'Supply'],
    ['fee_schedule_key', 'Fee Schedule'],
  ];
  return keyMap
    .filter(([field]) => info[field] != null)
    .map(([, label]) => label);
}

async function getTokenVolume24h(tokenId: string): Promise<number | null> {
  if (!env.hgraphApiKey) return null;
  const nowMs = Date.now();
  const startNs = (nowMs - 24 * 60 * 60 * 1000) * 1_000_000;
  const endNs = nowMs * 1_000_000;
  const idNum = tokenIdNumeric(tokenId);

  const query = `
    query TokenVolume24h {
      volume: ecosystem_nft_collection_sales_volume_total(
        args: {
          token_ids: "{${idNum}}"
          start_ts: "${startNs}"
          end_ts: "${endNs}"
        }
      ) {
        total
      }
    }
  `;

  try {
    const res = await fetchWithRetry(
      'https://mainnet.hedera.api.hgraph.io/v1/graphql',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.hgraphApiKey,
        },
        body: JSON.stringify({ query }),
      }
    );
    if (!res.ok) return null;
    const json = (await res.json()) as {
      data?: { volume?: { total: number | string }[] };
    };
    const total = asNumber(json.data?.volume?.[0]?.total);
    // HBAR-denominated values from Hgraph are usually returned in tinybar.
    return total != null ? total / 100_000_000 : null;
  } catch {
    return null;
  }
}

async function getTokenMetricsUncached(): Promise<TokenMetrics> {
  const tokenId = env.tokenIds[0];
  if (!tokenId) {
    return {
      tokenId: '—',
      treasury: null,
      totalSupply: null,
      minted: null,
      holders: null,
      keys: [],
      volume24hHbar: null,
      lastUpdated: new Date().toISOString(),
    };
  }

  const [info, holders, volume24hHbar] = await Promise.all([
    getTokenInfo(tokenId),
    getTokenHolderCount(tokenId),
    getTokenVolume24h(tokenId),
  ]);

  return {
    tokenId,
    treasury: (info?.treasury_account_id as string) ?? null,
    totalSupply: asNumber(info?.max_supply ?? info?.total_supply),
    minted: asNumber(info?.total_supply),
    holders,
    keys: info ? tokenKeys(info) : [],
    volume24hHbar,
    lastUpdated: new Date().toISOString(),
  };
}

const TOKEN_METRICS_TTL_SECONDS = 60;

export const getTokenMetrics = unstable_cache(
  getTokenMetricsUncached,
  ['token-metrics', env.hgraphApiKey, env.tokenIds.join(',')],
  { revalidate: TOKEN_METRICS_TTL_SECONDS }
);
