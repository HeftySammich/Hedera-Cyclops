import { NextRequest, NextResponse } from 'next/server';
import { requireHolder } from '@/lib/session';
import { gateError } from '@/lib/api';
import { getNftDetail, getOwnedSerialsForWallet } from '@/lib/nft';

export async function GET(request: NextRequest) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const owned = await getOwnedSerialsForWallet(gate.user.walletAddress);
  const nfts = await Promise.all(
    owned.map(({ tokenId, serial }) => getNftDetail(tokenId, serial))
  );

  return NextResponse.json({ nfts: nfts.filter(Boolean) });
}
