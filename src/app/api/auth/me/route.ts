import { NextRequest, NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/session';
import { getOwnedSerialsForWallet, resolvePfpImageUrl } from '@/lib/nft';

export async function GET(request: NextRequest) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ user: null });

  const [owned, pfpImageUrl] = await Promise.all([
    getOwnedSerialsForWallet(user.walletAddress),
    resolvePfpImageUrl(user.walletAddress, user.pfpSerial),
  ]);
  return NextResponse.json({
    user: {
      id: user.id,
      walletAddress: user.walletAddress,
      username: user.username,
      pfpSerial: user.pfpSerial,
      pfpImageUrl,
      isAdmin: user.isAdmin,
    },
    ownedSerials: owned,
    holdsCollection: owned.length > 0,
  });
}
