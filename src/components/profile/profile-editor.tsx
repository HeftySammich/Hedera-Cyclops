'use client';

import { useState } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Panel } from '@/components/ascii/panel';
import { Button } from '@/components/ascii/button';
import { HolderGate } from '@/components/gating/holder-gate';
import { ProfileHistory } from './profile-history';

export function ProfileEditor() {
  const { user, holdsCollection, ownedSerials, refreshUser } = useWallet();
  const [username, setUsername] = useState(user?.username ?? '');
  const [pfpSerial, setPfpSerial] = useState<number | null>(user?.pfpSerial ?? null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  if (!user) {
    return <HolderGate>{null}</HolderGate>;
  }

  async function submit() {
    setSubmitting(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch('/api/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(username !== user?.username ? { username } : {}),
          ...(pfpSerial !== user?.pfpSerial ? { pfpSerial } : {}),
        }),
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
          placeholder="anon"
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
        ) : (
          <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
            {ownedSerials.map(({ serial }) => (
              <button
                key={serial}
                onClick={() => setPfpSerial(serial)}
                className={`border p-1 text-xs ${
                  pfpSerial === serial ? 'border-sage text-sage' : 'border-neutral-700 text-muted'
                }`}
              >
                #{serial}
              </button>
            ))}
          </div>
        )}
      </Panel>

      <ProfileHistory />
    </div>
  );
}
