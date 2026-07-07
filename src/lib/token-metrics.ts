import { unstable_cache } from 'next/cache';
import { env } from './env';
import { fetchWithRetry } from './fetch-retry';

export interface TokenMetrics {
  tokenId: string;
  treasury: string | null;
  maxSupply: number | null;
  minted: number | null;
  holders: number | null;
  keys: string[];
  lastUpdated: string;
}

function asNumber(value: unknown): number | null {
  if (value == null) return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
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
    ['metadata_key', 'Metadata'],
    ['fee_schedule_key', 'Fee Schedule'],
  ];
  return keyMap
    .filter(([field]) => info[field] != null)
    .map(([, label]) => label);
}

async function getTokenMetricsUncached(): Promise<TokenMetrics> {
  const tokenId = env.tokenIds[0];
  if (!tokenId) {
    return {
      tokenId: '—',
      treasury: null,
      maxSupply: null,
      minted: null,
      holders: null,
      keys: [],
      lastUpdated: new Date().toISOString(),
    };
  }

  const [info, holders] = await Promise.all([
    getTokenInfo(tokenId),
    getTokenHolderCount(tokenId),
  ]);

  return {
    tokenId,
    treasury: (info?.treasury_account_id as string) ?? null,
    maxSupply: asNumber(info?.max_supply),
    minted: asNumber(info?.total_supply),
    holders,
    keys: info ? tokenKeys(info) : [],
    lastUpdated: new Date().toISOString(),
  };
}

const TOKEN_METRICS_TTL_SECONDS = 60;

export const getTokenMetrics = unstable_cache(
  getTokenMetricsUncached,
  ['token-metrics', env.hgraphApiKey, env.tokenIds.join(',')],
  { revalidate: TOKEN_METRICS_TTL_SECONDS }
);
