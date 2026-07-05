import { unstable_cache } from 'next/cache';
import { env } from './env';
import { fetchWithRetry } from './fetch-retry';
import { TtlCache } from './ttl-cache';
import {
  getNftBySerial,
  getNftsForAccountAndToken,
  getOwnedSerials,
  getTokenSupply,
  listNftsForToken,
  type MirrorNftRecord,
} from './mirror-node';
import { parseNftMetadata, type CyclopsNft, type NftMetadata } from './traits';
import { getMockCollection, getMockNftBySerial, getMockOwnedSerials } from './mock-nfts';

// Metadata JSON pointed to by a token's on-chain metadata URI is immutable
// once minted, so a longer cache TTL than holdership checks is safe here.
const METADATA_TTL_MS = 60 * 60_000; // 1 hour
const metadataCache = new TtlCache<NftMetadata | null>(METADATA_TTL_MS);

function decodeMetadataUri(base64Metadata: string): string {
  return Buffer.from(base64Metadata, 'base64').toString('utf-8').trim();
}

function resolveIpfsUri(uri: string): string {
  if (uri.startsWith('ipfs://')) {
    return `${env.ipfsGatewayUrl.replace(/\/$/, '')}/ipfs/${uri.slice('ipfs://'.length)}`;
  }
  return uri;
}

async function fetchMetadataForRecord(record: MirrorNftRecord): Promise<NftMetadata | null> {
  const cacheKey = `${record.token_id}:${record.serial_number}`;
  return metadataCache.getOrSet(cacheKey, async () => {
    const uri = resolveIpfsUri(decodeMetadataUri(record.metadata));
    const res = await fetchWithRetry(
      uri,
      {},
      { maxAttempts: 5, baseDelayMs: 250, maxDelayMs: 10_000 }
    );
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`Metadata fetch failed (${res.status}): ${uri}`);
    }
    const json = await res.json();
    const metadata = parseNftMetadata(json);
    if (!metadata) return null;
    // Resolve ipfs:// image URIs so the browser can load them via the
    // configured gateway; leave non-ipfs URIs untouched.
    return { ...metadata, image: resolveIpfsUri(metadata.image) };
  });
}

function toCyclopsNft(record: MirrorNftRecord, metadata: NftMetadata): CyclopsNft {
  return {
    tokenId: record.token_id,
    serial: record.serial_number,
    owner: record.account_id,
    metadata,
  };
}

// Limit concurrent IPFS metadata fetches so the collection page doesn't
// hammer the gateway (or itself) when warming the cache for the first time.
const METADATA_CONCURRENCY = 20;

async function fetchAllMetadata(records: MirrorNftRecord[]): Promise<(NftMetadata | null)[]> {
  const pending = records.map((record) => () => fetchMetadataForRecord(record));
  const results: (NftMetadata | null)[] = new Array(pending.length).fill(null);
  let index = 0;

  async function worker() {
    while (index < pending.length) {
      const slot = index++;
      try {
        results[slot] = await pending[slot]();
      } catch {
        results[slot] = null;
      }
    }
  }

  await Promise.all(Array.from({ length: METADATA_CONCURRENCY }, () => worker()));
  return results;
}

async function getCollectionUncached(): Promise<CyclopsNft[]> {
  if (env.useMockNfts) return getMockCollection();

  const records: MirrorNftRecord[] = [];
  for (const tokenId of env.tokenIds) {
    let next: string | null = null;
    // Mirror Node paginates; walk every page for a complete gallery.
    for (;;) {
      const page = await listNftsForToken(tokenId, { next });
      records.push(...page.nfts);
      if (!page.next) break;
      next = page.next;
    }
  }

  const metadataList = await fetchAllMetadata(records);
  const results: CyclopsNft[] = [];
  for (let i = 0; i < records.length; i++) {
    const metadata = metadataList[i];
    if (metadata) results.push(toCyclopsNft(records[i], metadata));
  }
  return results.sort((a, b) => a.serial - b.serial);
}

/** Full collection listing across all configured token ids, for the
 * Collection page. Falls back to mock fixtures only when nothing real is
 * configured.
 *
 * Cached across requests because the metadata is immutable; ownership updates
 * within the 5-minute window are acceptable for a gallery view. Holder gating
 * always re-verifies ownership live, never from this cache. */
export const getCollection = unstable_cache(
  getCollectionUncached,
  // Bumping the cache key version forces a fresh fetch after code changes that
  // affect the cached shape (e.g. adding IPFS image URL resolution).
  ['cyclops-collection', 'v2', env.tokenIds.join(','), env.ipfsGatewayUrl],
  { revalidate: 300, tags: ['cyclops-collection'] }
);

/** Total minted count across all configured token ids, for the homepage
 * mint-progress indicator. */
export async function getMintedCount(): Promise<number> {
  if (env.useMockNfts) return getMockCollection().length;
  let total = 0;
  for (const tokenId of env.tokenIds) total += await getTokenSupply(tokenId);
  return total;
}

export async function getNftDetail(tokenId: string, serial: number): Promise<CyclopsNft | null> {
  if (env.useMockNfts) return getMockNftBySerial(serial);

  const record = await getNftBySerial(tokenId, serial);
  if (!record) return null;
  const metadata = await fetchMetadataForRecord(record);
  if (!metadata) return null;
  return toCyclopsNft(record, metadata);
}

/** Serials a wallet currently owns, across all configured token ids. Always
 * a live Mirror Node read (or mock fixture) — never trust a stored value. */
export async function getOwnedSerialsForWallet(
  walletAddress: string
): Promise<{ tokenId: string; serial: number }[]> {
  if (env.useMockNfts) return getMockOwnedSerials(walletAddress);
  return getOwnedSerials(walletAddress);
}

/** Full NFT data for every Cyclops a wallet currently owns. Uses paginated
 * Mirror Node reads (not one request per serial) to avoid rate limits for
 * treasury-sized wallets. */
export async function getOwnedNftsForWallet(walletAddress: string): Promise<CyclopsNft[]> {
  if (env.useMockNfts) {
    return getMockOwnedSerials(walletAddress)
      .map(({ serial }) => getMockNftBySerial(serial))
      .filter((nft): nft is CyclopsNft => nft !== null);
  }

  const records: MirrorNftRecord[] = [];
  for (const tokenId of env.tokenIds) {
    const nfts = await getNftsForAccountAndToken(tokenId, walletAddress);
    records.push(...nfts);
  }

  const metadataList = await fetchAllMetadata(records);
  const results: CyclopsNft[] = [];
  for (let i = 0; i < records.length; i++) {
    const metadata = metadataList[i];
    if (metadata) results.push(toCyclopsNft(records[i], metadata));
  }
  return results.sort((a, b) => a.serial - b.serial);
}

/** Resolve a user's chosen PFP serial to full NFT data, re-validating that
 * they still own it. Returns null if unset, unowned, or metadata missing. */
export async function resolvePfp(
  walletAddress: string,
  pfpSerial: number | null
): Promise<CyclopsNft | null> {
  if (pfpSerial === null) return null;
  const owned = await getOwnedSerialsForWallet(walletAddress);
  const match = owned.find((o) => o.serial === pfpSerial);
  if (!match) return null;
  return getNftDetail(match.tokenId, pfpSerial);
}

/** Convenience helper: just the PFP image URL, or null if none/invalid. */
export async function resolvePfpImageUrl(
  walletAddress: string,
  pfpSerial: number | null
): Promise<string | null> {
  const nft = await resolvePfp(walletAddress, pfpSerial);
  return nft?.metadata.image ?? null;
}
