import { NextRequest, NextResponse } from 'next/server';
import { requireHolder } from '@/lib/session';
import { gateError } from '@/lib/api';
import { getOwnedNftsForWallet } from '@/lib/nft';

export async function GET(request: NextRequest) {
  const gate = await requireHolder(request);
  if (!gate.ok) return gateError(gate);

  const nfts = await getOwnedNftsForWallet(gate.user.walletAddress);
  return NextResponse.json({ nfts });
}
