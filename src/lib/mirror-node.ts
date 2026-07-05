import { env } from './env';
import { TtlCache } from './ttl-cache';

// All Hedera chain reads go through the public Mirror Node REST API — no API
// key required. Ownership is NEVER trusted from the client; every gated write
// re-checks holdership here (with a short TTL cache to avoid hammering the
// Mirror Node, never to skip the check).

export interface MirrorNftRecord {
  account_id: string;
  token_id: string;
  serial_number: number;
  metadata: string; // base64-encoded metadata URI
}

export interface MirrorAccountKey {
  _type: 'ED25519' | 'ECDSA_SECP256K1' | string;
  key: string;
}

const HOLDERSHIP_TTL_MS = 60_000; // ~60s per §9.5
const holdershipCache = new TtlCache<boolean>(HOLDERSHIP_TTL_MS);
const nftListCache = new TtlCache<MirrorNftRecord[]>(HOLDERSHIP_TTL_MS);

async function mirrorFetch<T>(path: string): Promise<T | null> {
  const url = `${env.mirrorNodeBaseUrl}${path}`;
  const res = await fetch(url, { headers: { accept: 'application/json' } });
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Mirror Node request failed (${res.status}): ${url}`);
  }
  return (await res.json()) as T;
}

export async function getAccountPublicKey(
  accountId: string
): Promise<MirrorAccountKey | null> {
  const data = await mirrorFetch<{ key: MirrorAccountKey | null }>(
    `/api/v1/accounts/${encodeURIComponent(accountId)}`
  );
  return data?.key ?? null;
}

export async function getNftsForAccountAndToken(
  tokenId: string,
  accountId: string
): Promise<MirrorNftRecord[]> {
  const cacheKey = `${tokenId}:${accountId}`;
  return nftListCache.getOrSet(cacheKey, async () => {
    const results: MirrorNftRecord[] = [];
    let next: string | null =
      `/api/v1/tokens/${tokenId}/nfts?account.id=${encodeURIComponent(accountId)}&limit=100`;
    while (next) {
      const data: { nfts: MirrorNftRecord[]; links?: { next?: string | null } } | null =
        await mirrorFetch(next);
      if (!data) break;
      results.push(...data.nfts);
      next = data.links?.next ?? null;
    }
    return results;
  });
}

/** Live re-check: does this account currently hold at least one NFT across
 * any of the configured Cyclops token ids? Cached briefly per §9.5. */
export async function accountHoldsCollection(accountId: string): Promise<boolean> {
  if (env.tokenIds.length === 0) return false;
  return holdershipCache.getOrSet(accountId, async () => {
    for (const tokenId of env.tokenIds) {
      const nfts = await getNftsForAccountAndToken(tokenId, accountId);
      if (nfts.length > 0) return true;
    }
    return false;
  });
}

/** Serials (per token id) actually owned by this account right now. */
export async function getOwnedSerials(
  accountId: string
): Promise<{ tokenId: string; serial: number }[]> {
  const owned: { tokenId: string; serial: number }[] = [];
  for (const tokenId of env.tokenIds) {
    const nfts = await getNftsForAccountAndToken(tokenId, accountId);
    for (const nft of nfts) owned.push({ tokenId, serial: nft.serial_number });
  }
  return owned;
}

export async function getNftBySerial(
  tokenId: string,
  serial: number
): Promise<MirrorNftRecord | null> {
  return mirrorFetch<MirrorNftRecord>(`/api/v1/tokens/${tokenId}/nfts/${serial}`);
}

export async function listNftsForToken(
  tokenId: string,
  opts: { limit?: number; next?: string | null } = {}
): Promise<{ nfts: MirrorNftRecord[]; next: string | null }> {
  const limit = opts.limit ?? 25;
  // Use the Mirror Node's own `links.next` cursor when paginating; it knows
  // whether results are ascending (gt:) or descending (lt:) and encodes any
  // other filters. The initial call builds the path from the token id.
  const path =
    opts.next ??
    `/api/v1/tokens/${tokenId}/nfts?limit=${limit}`;
  const data = await mirrorFetch<{
    nfts: MirrorNftRecord[];
    links?: { next?: string | null };
  }>(path);
  return { nfts: data?.nfts ?? [], next: data?.links?.next ?? null };
}

export async function getTokenSupply(tokenId: string): Promise<number> {
  const data = await mirrorFetch<{ total_supply: string }>(`/api/v1/tokens/${tokenId}`);
  return data ? Number(data.total_supply) : 0;
}

export function clearMirrorNodeCaches(): void {
  holdershipCache.clear();
  nftListCache.clear();
}
