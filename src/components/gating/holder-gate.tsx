'use client';

import type { ReactNode } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Panel } from '@/components/ascii/panel';
import { Button } from '@/components/ascii/button';

/**
 * Client-side UI gate only — a friendly prompt to connect/sign in when the
 * wallet doesn't (yet) hold a Cyclops. This is NOT the security boundary:
 * every gated write is re-validated against Mirror Node on the server
 * regardless of what this component renders.
 */
export function HolderGate({ children }: { children: ReactNode }) {
  const { user, holdsCollection, isSigningIn, error, signIn } = useWallet();

  if (user && holdsCollection) return <>{children}</>;

  return (
    <Panel title="Holders Only" className="text-center">
      <p className="mb-4 text-sm text-muted">
        {user
          ? "This wallet doesn't currently hold a Hedera Cyclops."
          : 'Connect your wallet, then sign the message to verify ownership and continue.'}
      </p>
      {!user ? (
        <Button onClick={() => signIn()} disabled={isSigningIn}>
          {isSigningIn ? 'Connecting…' : 'Connect Wallet'}
        </Button>
      ) : null}
      {error ? <p className="mt-3 text-xs text-red-400">{error}</p> : null}
    </Panel>
  );
}
