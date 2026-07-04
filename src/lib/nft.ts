import { env } from './env';
import { TtlCache } from './ttl-cache';
import {
  getNftBySerial,
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
    try {
      const uri = resolveIpfsUri(decodeMetadataUri(record.metadata));
      const res = await fetch(uri);
      if (!res.ok) return null;
      const json = await res.json();
      return parseNftMetadata(json);
    } catch {
      return null;
    }
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

/** Full collection listing across all configured token ids, for the
 * Collection page. Falls back to mock fixtures only when nothing real is
 * configured. */
export async function getCollection(): Promise<CyclopsNft[]> {
  if (env.useMockNfts) return getMockCollection();

  const results: CyclopsNft[] = [];
  for (const tokenId of env.tokenIds) {
    let after: string | undefined;
    // Mirror Node paginates; walk every page for a complete gallery.
    for (;;) {
      const { nfts, next } = await listNftsForToken(tokenId, { after });
      for (const record of nfts) {
        const metadata = await fetchMetadataForRecord(record);
        if (metadata) results.push(toCyclopsNft(record, metadata));
      }
      if (!next) break;
      after = String(nfts[nfts.length - 1]?.serial_number ?? after);
    }
  }
  return results.sort((a, b) => a.serial - b.serial);
}

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
