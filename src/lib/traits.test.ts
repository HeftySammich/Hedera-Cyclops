import { describe, expect, it } from 'vitest';
import { parseNftMetadata, buildTraitFacets, filterNfts, type CyclopsNft } from './traits';

describe('parseNftMetadata', () => {
  it('parses a well-formed metadata object', () => {
    const parsed = parseNftMetadata({
      name: 'Cyclops #1',
      description: 'desc',
      image: 'ipfs://abc',
      attributes: [{ trait_type: 'Background', value: 'Void Black' }],
    });
    expect(parsed).toEqual({
      name: 'Cyclops #1',
      description: 'desc',
      image: 'ipfs://abc',
      attributes: [{ trait_type: 'Background', value: 'Void Black' }],
    });
  });

  it('defaults missing description and drops malformed attributes', () => {
    const parsed = parseNftMetadata({
      name: 'Cyclops #2',
      image: 'ipfs://xyz',
      attributes: [{ trait_type: 'Iris' }, { trait_type: 'Headwear', value: 'None' }],
    });
    expect(parsed?.description).toBe('');
    expect(parsed?.attributes).toEqual([{ trait_type: 'Headwear', value: 'None' }]);
  });

  it('returns null when required fields are missing', () => {
    expect(parseNftMetadata({ description: 'no name or image' })).toBeNull();
    expect(parseNftMetadata(null)).toBeNull();
    expect(parseNftMetadata('not an object')).toBeNull();
  });
});

function nft(serial: number, owner: string, attrs: Record<string, string>): CyclopsNft {
  return {
    tokenId: '0.0.1',
    serial,
    owner,
    metadata: {
      name: `Cyclops #${serial}`,
      description: '',
      image: 'ipfs://x',
      attributes: Object.entries(attrs).map(([trait_type, value]) => ({ trait_type, value })),
    },
  };
}

describe('buildTraitFacets', () => {
  it('derives sorted, distinct trait values from the given NFTs', () => {
    const nfts = [
      nft(1, '0.0.100', { Background: 'Void Black', Iris: 'Laser' }),
      nft(2, '0.0.101', { Background: 'Terminal Green', Iris: 'Laser' }),
    ];
    expect(buildTraitFacets(nfts)).toEqual({
      Background: ['Terminal Green', 'Void Black'],
      Iris: ['Laser'],
    });
  });

  it('returns an empty object for an empty collection', () => {
    expect(buildTraitFacets([])).toEqual({});
  });
});

describe('filterNfts', () => {
  const nfts = [
    nft(1, '0.0.500', { Background: 'Void Black' }),
    nft(2, '0.0.501', { Background: 'Terminal Green' }),
    nft(3, '0.0.502', { Background: 'Void Black' }),
  ];

  it('filters by a single trait value', () => {
    const result = filterNfts(nfts, { traits: { Background: ['Void Black'] } });
    expect(result.map((n) => n.serial)).toEqual([1, 3]);
  });

  it('matches multiple values within the same trait with OR semantics', () => {
    const result = filterNfts(nfts, {
      traits: { Background: ['Void Black', 'Terminal Green'] },
    });
    expect(result).toHaveLength(3);
  });

  it('filters by serial number search', () => {
    expect(filterNfts(nfts, { search: '3' }).map((n) => n.serial)).toEqual([3]);
  });

  it('filters by owner account id search', () => {
    expect(filterNfts(nfts, { search: '0.0.501' }).map((n) => n.serial)).toEqual([2]);
  });

  it('returns all NFTs when the filter is empty', () => {
    expect(filterNfts(nfts, {})).toHaveLength(3);
  });
});
