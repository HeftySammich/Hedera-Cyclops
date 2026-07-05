'use client';

import { createContext, useCallback, useContext, useMemo, useState, useEffect } from 'react';
import { connectWallet, disconnectWallet, signMessageWithWallet } from '@/lib/wallet-client';

export interface SessionUser {
  id: string;
  walletAddress: string;
  username: string | null;
  pfpSerial: number | null;
  isAdmin: boolean;
}

interface WalletState {
  accountId: string | null;
  user: SessionUser | null;
  holdsCollection: boolean;
  ownedSerials: { tokenId: string; serial: number }[];
  isSigningIn: boolean;
  error: string | null;
}

interface WalletContextValue extends WalletState {
  signIn: () => Promise<void>;
  disconnect: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const INITIAL_STATE: WalletState = {
  accountId: null,
  user: null,
  holdsCollection: false,
  ownedSerials: [],
  isSigningIn: false,
  error: null,
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<WalletState>(INITIAL_STATE);

  const refreshUser = useCallback(async () => {
    const res = await fetch('/api/auth/me').catch(() => null);
    if (!res || !res.ok) return;
    const data = await res.json();
    setState((s) => ({
      ...s,
      user: data.user,
      holdsCollection: Boolean(data.holdsCollection),
      ownedSerials: data.ownedSerials ?? [],
      accountId: data.user?.walletAddress ?? s.accountId,
    }));
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const signIn = useCallback(async () => {
    setState((s) => ({ ...s, isSigningIn: true, error: null }));
    try {
      // Pair the wallet first if we don't have an account yet, then immediately
      // request the sign-in signature so the user only clicks one button.
      let accountId = state.accountId;
      if (!accountId) {
        accountId = await connectWallet();
        if (!accountId) throw new Error('No wallet account available.');
        setState((s) => ({ ...s, accountId }));
      }

      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: accountId }),
      });
      if (!nonceRes.ok) throw new Error('Could not start sign-in.');
      const { nonce, message } = await nonceRes.json();

      const signatureMap = await signMessageWithWallet(accountId, message);

      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ walletAddress: accountId, nonce, signature: signatureMap }),
      });
      if (!verifyRes.ok) {
        const body = await verifyRes.json().catch(() => ({}));
        throw new Error(body.error ?? 'Sign-in failed.');
      }

      setState((s) => ({ ...s, accountId, isSigningIn: false }));
      await refreshUser();
    } catch (err) {
      setState((s) => ({
        ...s,
        isSigningIn: false,
        error: err instanceof Error ? err.message : 'Sign-in failed.',
      }));
    }
  }, [state.accountId, refreshUser]);

  const disconnect = useCallback(async () => {
    await disconnectWallet().catch(() => undefined);
    await fetch('/api/auth/logout', { method: 'POST' }).catch(() => undefined);
    setState(INITIAL_STATE);
  }, []);

  const value = useMemo<WalletContextValue>(
    () => ({ ...state, signIn, disconnect, refreshUser }),
    [state, signIn, disconnect, refreshUser]
  );

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within a WalletProvider');
  return ctx;
}
