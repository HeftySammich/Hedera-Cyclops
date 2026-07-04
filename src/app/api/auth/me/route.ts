import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { getOwnedSerialsForWallet } from '@/lib/nft';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ user: null });

  const owned = await getOwnedSerialsForWallet(user.walletAddress);
  return NextResponse.json({
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      pfpSerial: user.pfpSerial,
      isAdmin: user.isAdmin,
    },
    ownedSerials: owned,
    holdsCollection: owned.length > 0,
  });
}
