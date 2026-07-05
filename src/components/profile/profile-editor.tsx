'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useWallet } from '@/components/wallet/wallet-context';
import { Panel } from '@/components/ascii/panel';
import { Button } from '@/components/ascii/button';
import { Avatar } from '@/components/ascii/avatar';
import { HolderGate } from '@/components/gating/holder-gate';
import { ProfileHistory } from './profile-history';
import type { CyclopsNft } from '@/lib/traits';

export function ProfileEditor() {
  const { user, holdsCollection, refreshUser } = useWallet();
  const [username, setUsername] = useState(user?.username ?? '');
  const [pfpSerial, setPfpSerial] = useState<number | null>(user?.pfpSerial ?? null);
  const [ownedNfts, setOwnedNfts] = useState<CyclopsNft[]>([]);
  const [loadingNfts, setLoadingNfts] = useState(true);
  const [pendingPfp, setPendingPfp] = useState<CyclopsNft | null>(null);
  const [savingPfpSerial, setSavingPfpSerial] = useState<number | null>(null);
  const [pfpNotice, setPfpNotice] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  // The user object loads asynchronously, so keep the form state in sync.
  useEffect(() => {
    if (user) {
      setUsername(user.username ?? '');
      setPfpSerial(user.pfpSerial ?? null);
    }
  }, [user]);

  useEffect(() => {
    if (!user) return; // still resolving session; keep spinner
    if (!holdsCollection) {
      setOwnedNfts([]);
      setLoadingNfts(false);
      return;
    }
    let cancelled = false;
    setLoadingNfts(true);
    fetch('/api/profile/owned-nfts')
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setOwnedNfts(data.nfts ?? []);
      })
      .catch(() => setError('Could not load owned Cyclopes.'))
      .finally(() => setLoadingNfts(false));
    return () => {
      cancelled = true;
    };
  }, [user, holdsCollection]);

  if (!user) {
    return <HolderGate>{null}</HolderGate>;
  }

  const currentPfpNft = ownedNfts.find((nft) => nft.serial === pfpSerial);

  async function savePfp(serial: number) {
    setSavingPfpSerial(serial);
    setPfpNotice(null);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pfpSerial: serial }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update PFP.');
      }
      setPfpSerial(serial);
      await refreshUser();
      setPfpNotice({ type: 'success', text: 'PFP updated.' });
      setTimeout(() => setPfpNotice(null), 3000);
    } catch (err) {
      setPfpNotice({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to update PFP.',
      });
    } finally {
      setSavingPfpSerial(null);
      setPendingPfp(null);
    }
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const trimmedUsername = username.trim();
      const usernameChanged = trimmedUsername !== (user?.username ?? '');
      const usernamePayload =
        usernameChanged && trimmedUsername.length === 0
          ? { username: null }
          : usernameChanged && trimmedUsername.length >= 3
            ? { username: trimmedUsername }
            : {};
      const pfpPayload =
        pfpSerial !== user?.pfpSerial ? { pfpSerial } : {};

      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...usernamePayload, ...pfpPayload }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to update profile.');
      }
      await refreshUser();
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update profile.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Panel title="Identity">
        <label className="mb-1 block text-xs uppercase text-muted">Username</label>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="User"
          className="mb-3 w-full border border-neutral-700 bg-base px-2 py-1 text-sm text-ink placeholder:text-muted"
        />
        <label className="mb-1 block text-xs uppercase text-muted">Wallet</label>
        <p className="mb-3 text-xs text-muted">{user.walletAddress}</p>
        {error ? <p className="mb-2 text-xs text-red-400">{error}</p> : null}
        {saved ? <p className="mb-2 text-xs text-sage">Saved.</p> : null}
        <Button onClick={submit} disabled={submitting}>
          {submitting ? 'Saving…' : 'Save'}
        </Button>
      </Panel>

      <Panel title="PFP">
        {!holdsCollection ? (
          <p className="text-sm text-muted">
            No owned Cyclops found on this wallet - mint or acquire one to set a PFP.
          </p>
        ) : loadingNfts ? (
          <p className="text-sm text-muted">Loading NFT images…</p>
        ) : ownedNfts.length === 0 ? (
          <p className="text-sm text-muted">Could not load NFT images.</p>
        ) : (
          <>
            {pfpNotice ? (
              <p
                className={`mb-3 text-xs ${
                  pfpNotice.type === 'success' ? 'text-sage' : 'text-red-400'
                }`}
              >
                {pfpNotice.text}
              </p>
            ) : null}

            <div className="mb-4 flex items-center gap-3">
              {currentPfpNft ? (
                <>
                  <Avatar src={currentPfpNft.metadata.image} alt={currentPfpNft.metadata.name} size={64} />
                  <div>
                    <p className="text-xs uppercase text-muted">Current PFP</p>
                    <p className="text-sm text-sage">{currentPfpNft.metadata.name}</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-dashed border-neutral-700 text-xs text-muted">
                    ?
                  </div>
                  <div>
                    <p className="text-xs uppercase text-muted">Current PFP</p>
                    <p className="text-sm text-muted">None selected</p>
                  </div>
                </>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
              {ownedNfts.map((nft) => {
                const isPending = pendingPfp?.serial === nft.serial;
                return (
                  <button
                    key={nft.serial}
                    onClick={() => setPendingPfp(nft)}
                    className={`relative aspect-square overflow-hidden border p-0 ${
                      pfpSerial === nft.serial ? 'border-sage' : 'border-neutral-700'
                    }`}
                    aria-label={`Select Cyclops #${nft.serial} as PFP`}
                  >
                    <Image
                      src={nft.metadata.image}
                      alt={nft.metadata.name}
                      fill
                      className="object-cover"
                      unoptimized
                      sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 16vw"
                    />
                    {isPending ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-base/90 p-1">
                        {savingPfpSerial === nft.serial ? (
                          <p className="text-center text-[10px] leading-tight text-ink">Saving…</p>
                        ) : (
                          <>
                            <p className="mb-2 text-center text-[10px] leading-tight text-ink">
                              Set as PFP?
                            </p>
                            <div className="flex gap-1">
                              <Button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  savePfp(nft.serial);
                                }}
                                disabled={savingPfpSerial != null}
                                className="px-2 py-0.5 text-[10px]"
                              >
                                Yes
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPendingPfp(null);
                                }}
                                disabled={savingPfpSerial != null}
                                className="px-2 py-0.5 text-[10px]"
                              >
                                No
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <span className="absolute bottom-0 left-0 right-0 bg-base/80 px-1 py-0.5 text-[10px] text-muted">
                        #{nft.serial}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </>
        )}
      </Panel>

      <ProfileHistory />
    </div>
  );
}
