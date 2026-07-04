'use client';

import { useState } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Button } from '@/components/ascii/button';
import { HolderGate } from '@/components/gating/holder-gate';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function EventForm({ onCreated }: { onCreated?: () => void }) {
  const { user, holdsCollection } = useWallet();
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [xSpaceUrl, setXSpaceUrl] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !holdsCollection) return <HolderGate>{null}</HolderGate>;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/wall-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          projectName,
          xSpaceUrl,
          startsAt: new Date(startsAt).toISOString(),
          recurring,
          dayOfWeek: recurring ? dayOfWeek : null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create event.');
      }
      setTitle('');
      setProjectName('');
      setXSpaceUrl('');
      setStartsAt('');
      onCreated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create event.');
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
        placeholder="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="Project name"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="X Space URL"
        value={xSpaceUrl}
        onChange={(e) => setXSpaceUrl(e.target.value)}
      />
      <input
        type="datetime-local"
        className={inputClass}
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
      />
      <label className="flex items-center gap-2 text-xs text-muted">
        <input
          type="checkbox"
          checked={recurring}
          onChange={(e) => setRecurring(e.target.checked)}
        />
        Recurs weekly
      </label>
      {recurring ? (
        <select
          className={inputClass}
          value={dayOfWeek}
          onChange={(e) => setDayOfWeek(Number(e.target.value))}
        >
          {DAYS.map((d, i) => (
            <option key={d} value={i}>
              {d}
            </option>
          ))}
        </select>
      ) : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      <Button
        onClick={submit}
        disabled={submitting || !title || !projectName || !xSpaceUrl || !startsAt}
      >
        {submitting ? 'Adding…' : 'Add to Wall'}
      </Button>
    </div>
  );
}
