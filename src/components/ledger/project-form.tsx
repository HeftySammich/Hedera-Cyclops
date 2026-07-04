'use client';

import { useState } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Button } from '@/components/ascii/button';
import { HolderGate } from '@/components/gating/holder-gate';

export function ProjectForm({ onCreated }: { onCreated?: () => void }) {
  const { user, holdsCollection } = useWallet();
  const [name, setName] = useState('');
  const [xHandle, setXHandle] = useState('');
  const [website, setWebsite] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !holdsCollection) return <HolderGate>{null}</HolderGate>;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          xHandle: xHandle || null,
          website: website || null,
          description,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to submit project.');
      }
      setName('');
      setXHandle('');
      setWebsite('');
      setDescription('');
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit project.');
    } finally {
      setSubmitting(false);
    }
  }

  const inputClass =
    'w-full border border-neutral-700 bg-base px-2 py-1 text-sm text-ink placeholder:text-muted';

  return (
    <div className="flex flex-col gap-2 border border-neutral-800 p-3">
      <input
        className={inputClass}
        placeholder="Project name"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="@x_handle (optional)"
        value={xHandle}
        onChange={(e) => setXHandle(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Website (optional)"
        value={website}
        onChange={(e) => setWebsite(e.target.value)}
      />
      <textarea
        className={inputClass}
        placeholder="Short description"
        rows={3}
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      <Button onClick={submit} disabled={submitting || !name || !description}>
        {submitting ? 'Submitting…' : 'Submit Project'}
      </Button>
    </div>
  );
}
