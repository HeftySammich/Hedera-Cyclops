import { NextRequest, NextResponse } from 'next/server';
import { getCollection } from '@/lib/nft';
import { buildTraitFacets, filterNfts } from '@/lib/traits';
import { nftFilterSchema } from '@/lib/validation';
import { zodError } from '@/lib/api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const traitsParam = searchParams.get('traits');
  const parsed = nftFilterSchema.safeParse({
    traits: traitsParam ? JSON.parse(traitsParam) : undefined,
    search: searchParams.get('search') ?? undefined,
  });
  if (!parsed.success) return zodError(parsed.error);

  const collection = await getCollection();
  const facets = buildTraitFacets(collection);
  const filtered = filterNfts(collection, parsed.data);

  const page = Math.max(Number(searchParams.get('page') ?? '1') || 1, 1);
  const pageSize = Math.min(Number(searchParams.get('pageSize') ?? '24') || 24, 100);
  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return NextResponse.json({
    items,
    total: filtered.length,
    page,
    pageSize,
    facets,
  });
}
