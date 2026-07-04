// Parser/types built exactly against the example metadata shape in the
// design doc (§10). Trait filter options are always derived from whatever
// metadata is actually present — never a hardcoded trait list.

export interface NftAttribute {
  trait_type: string;
  value: string;
}

export interface NftMetadata {
  name: string;
  description: string;
  image: string;
  attributes: NftAttribute[];
}

export interface CyclopsNft {
  tokenId: string;
  serial: number;
  owner: string;
  metadata: NftMetadata;
}

export function parseNftMetadata(raw: unknown): NftMetadata | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  if (typeof obj.name !== 'string' || typeof obj.image !== 'string') return null;
  const attributes: NftAttribute[] = Array.isArray(obj.attributes)
    ? obj.attributes
        .filter(
          (a): a is NftAttribute =>
            !!a &&
            typeof a === 'object' &&
            typeof (a as NftAttribute).trait_type === 'string' &&
            typeof (a as NftAttribute).value === 'string'
        )
        .map((a) => ({ trait_type: a.trait_type, value: a.value }))
    : [];
  return {
    name: obj.name,
    description: typeof obj.description === 'string' ? obj.description : '',
    image: obj.image,
    attributes,
  };
}

/** trait_type -> sorted distinct values, derived only from what's present. */
export type TraitFacets = Record<string, string[]>;

export function buildTraitFacets(nfts: CyclopsNft[]): TraitFacets {
  const facets: Record<string, Set<string>> = {};
  for (const nft of nfts) {
    for (const attr of nft.metadata.attributes) {
      if (!facets[attr.trait_type]) facets[attr.trait_type] = new Set();
      facets[attr.trait_type].add(attr.value);
    }
  }
  const result: TraitFacets = {};
  for (const [trait, values] of Object.entries(facets)) {
    result[trait] = Array.from(values).sort((a, b) => a.localeCompare(b));
  }
  return result;
}

export interface NftFilter {
  traits?: Record<string, string[]>; // trait_type -> allowed values (OR within, AND across)
  search?: string; // matches serial number or owner account id
}

export function filterNfts(nfts: CyclopsNft[], filter: NftFilter): CyclopsNft[] {
  let result = nfts;

  if (filter.traits) {
    for (const [traitType, values] of Object.entries(filter.traits)) {
      if (!values || values.length === 0) continue;
      result = result.filter((nft) =>
        nft.metadata.attributes.some(
          (a) => a.trait_type === traitType && values.includes(a.value)
        )
      );
    }
  }

  if (filter.search) {
    const q = filter.search.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (nft) => String(nft.serial).includes(q) || nft.owner.toLowerCase().includes(q)
      );
    }
  }

  return result;
}
