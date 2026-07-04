import type { CyclopsNft, NftMetadata } from './traits';
import { env } from './env';

// Deterministic mock collection for local development / demos only. Gated
// behind env.useMockNfts, which is hard-wired to require zero configured
// token ids — real on-chain config always takes priority, so this can never
// accidentally mask a misconfiguration in a real deployment.

const MOCK_TOKEN_ID = '0.0.MOCK';

const BACKGROUNDS = ['Void Black', 'Terminal Green', 'Signal Red', 'Static Grey'];
const IRISES = ['Cracked Lens', 'Compound', 'Laser', 'Glitched', 'Analog'];
const HEADWEAR = ['None', 'Antenna', 'Tin Foil', 'Hood', 'Wires'];
const MARKINGS = ['None', 'Scan Lines', 'Circuit Scars', 'Rust'];

function pick<T>(arr: T[], seed: number): T {
  return arr[seed % arr.length];
}

// Simple deterministic PRNG-ish hash so the same serial always yields the
// same traits across requests without persisting anything.
function hashSeed(serial: number, salt: number): number {
  return Math.abs(Math.sin(serial * 99991 + salt * 7919) * 10000) | 0;
}

function mockMetadataFor(serial: number): NftMetadata {
  return {
    name: `Hedera Cyclops #${serial}`,
    description: 'A one-eyed watcher, minted on Hedera. (Mock fixture for local dev.)',
    image: `https://picsum.photos/seed/cyclops-${serial}/512/512`,
    attributes: [
      { trait_type: 'Background', value: pick(BACKGROUNDS, hashSeed(serial, 1)) },
      { trait_type: 'Iris', value: pick(IRISES, hashSeed(serial, 2)) },
      { trait_type: 'Headwear', value: pick(HEADWEAR, hashSeed(serial, 3)) },
      { trait_type: 'Markings', value: pick(MARKINGS, hashSeed(serial, 4)) },
    ],
  };
}

const MOCK_OWNER_POOL = ['0.0.1001', '0.0.1002', '0.0.1003', '0.0.1004', '0.0.1005'];

export function getMockCollection(count = 50): CyclopsNft[] {
  return Array.from({ length: count }, (_, i) => {
    const serial = i + 1;
    return {
      tokenId: MOCK_TOKEN_ID,
      serial,
      owner: MOCK_OWNER_POOL[serial % MOCK_OWNER_POOL.length],
      metadata: mockMetadataFor(serial),
    };
  });
}

export function getMockNftBySerial(serial: number): CyclopsNft | null {
  if (serial < 1) return null;
  return {
    tokenId: MOCK_TOKEN_ID,
    serial,
    owner: MOCK_OWNER_POOL[serial % MOCK_OWNER_POOL.length],
    metadata: mockMetadataFor(serial),
  };
}

/** Give the connecting dev wallet a couple of mock NFTs so gated flows work
 * end-to-end locally without any real token configured. */
export function getMockOwnedSerials(_walletAddress: string): { tokenId: string; serial: number }[] {
  if (!env.useMockNfts) return [];
  return [
    { tokenId: MOCK_TOKEN_ID, serial: 1 },
    { tokenId: MOCK_TOKEN_ID, serial: 2 },
  ];
}
