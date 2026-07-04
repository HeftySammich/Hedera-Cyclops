import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/lib/env';
import { getNftDetail } from '@/lib/nft';
import { jsonError } from '@/lib/api';

export async function GET(request: NextRequest, { params }: { params: { serial: string } }) {
  const serial = Number(params.serial);
  if (!Number.isInteger(serial) || serial < 1) {
    return jsonError('Invalid serial number.', 400);
  }

  const { searchParams } = new URL(request.url);
  const tokenId = searchParams.get('tokenId') ?? env.tokenIds[0];
  if (!tokenId) return jsonError('No token id configured.', 404);

  const nft = await getNftDetail(tokenId, serial);
  if (!nft) return jsonError('NFT not found.', 404);

  return NextResponse.json({ nft });
}
