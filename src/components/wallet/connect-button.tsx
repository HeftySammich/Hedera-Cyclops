'use client';

import { useWallet } from './wallet-context';
import { Button } from '@/components/ascii/button';

function shortAddress(address: string): string {
  return address.length > 12 ? `${address.slice(0, 6)}…${address.slice(-4)}` : address;
}

export function ConnectButton() {
  const { user, accountId, isSigningIn, signIn, disconnect } = useWallet();

  if (user) {
    return (
      <div className="flex items-center gap-2 font-mono text-xs">
        <span className="text-sage">{user.username ?? shortAddress(user.walletAddress)}</span>
        <Button variant="ghost" onClick={() => disconnect()}>
          Sign out
        </Button>
      </div>
    );
  }

  if (accountId) {
    return (
      <Button onClick={() => signIn()} disabled={isSigningIn}>
        {isSigningIn ? 'Signing…' : shortAddress(accountId)}
      </Button>
    );
  }

  return (
    <Button onClick={() => signIn()} disabled={isSigningIn}>
      {isSigningIn ? 'Connecting…' : 'Connect Wallet'}
    </Button>
  );
}
