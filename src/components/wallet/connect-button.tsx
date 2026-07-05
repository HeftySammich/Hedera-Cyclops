'use client';

import { useEffect, useRef, useState } from 'react';
import { useWallet } from './wallet-context';
import { Button } from '@/components/ascii/button';
import { Avatar } from '@/components/ascii/avatar';
import { shortAddress, userDisplayName } from '@/lib/display-name';

export function ConnectButton() {
  const { user, accountId, isSigningIn, signIn, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  if (user) {
    const displayName = userDisplayName(user.username, user.walletAddress);
    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 font-mono text-xs focus:outline-none"
          aria-label="Open wallet menu"
        >
          <Avatar src={user.pfpImageUrl} alt={displayName} size={24} />
          <span className="text-sage">{displayName}</span>
        </button>
        {open ? (
          <div className="absolute right-0 top-full z-50 mt-2 min-w-[12rem] border border-neutral-700 bg-base p-3 shadow-lg">
            <p className="mb-3 break-all font-mono text-xs text-muted">
              {user.walletAddress}
            </p>
            <Button
              variant="ghost"
              onClick={() => {
                setOpen(false);
                disconnect();
              }}
              className="w-full justify-center"
            >
              Sign out
            </Button>
          </div>
        ) : null}
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
