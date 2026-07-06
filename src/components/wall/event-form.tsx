'use client';

import { useState } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Button } from '@/components/ascii/button';
import { HolderGate } from '@/components/gating/holder-gate';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const FREQUENCIES = [
  { value: '', label: 'Does not repeat' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Every other week' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekdays', label: 'Monday – Friday' },
] as const;

export function EventForm({ onCreated }: { onCreated?: () => void }) {
  const { user, holdsCollection } = useWallet();
  const [title, setTitle] = useState('');
  const [projectName, setProjectName] = useState('');
  const [xAccount, setXAccount] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [frequency, setFrequency] = useState<string>('');
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !holdsCollection) return <HolderGate>{null}</HolderGate>;

  const recurring = frequency !== '';
  const showDayOfWeek = recurring && (frequency === 'weekly' || frequency === 'biweekly');
  const weekdayNotice = recurring && frequency === 'weekdays';
  const monthlyDay = recurring && frequency === 'monthly' && startsAt
    ? new Date(startsAt).getDate()
    : null;

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title,
        projectName,
        xAccount,
        startsAt: new Date(startsAt).toISOString(),
        recurring,
      };

      if (recurring) {
        body.recurrenceFrequency = frequency;
        if (showDayOfWeek) {
          body.dayOfWeek = dayOfWeek;
        }
      }

      const res = await fetch('/api/wall-events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to create event.');
      }
      setTitle('');
      setProjectName('');
      setXAccount('');
      setStartsAt('');
      setFrequency('');
      setDayOfWeek(0);
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
        placeholder="Host (e.g. HashPack)"
        value={projectName}
        onChange={(e) => setProjectName(e.target.value)}
      />
      <input
        className={inputClass}
        placeholder="X account (@handle)"
        value={xAccount}
        onChange={(e) => setXAccount(e.target.value)}
      />
      <input
        type="datetime-local"
        className={inputClass}
        value={startsAt}
        onChange={(e) => setStartsAt(e.target.value)}
      />
      <p className="text-xs text-muted">Times are in your local timezone.</p>
      <select
        className={inputClass}
        value={frequency}
        onChange={(e) => setFrequency(e.target.value)}
      >
        {FREQUENCIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>
      {showDayOfWeek ? (
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
      {monthlyDay ? (
        <p className="text-xs text-muted">
          Repeats monthly on the {monthlyDay}
          {monthlyDay === 1 || monthlyDay === 21 || monthlyDay === 31
            ? 'st'
            : monthlyDay === 2 || monthlyDay === 22
              ? 'nd'
            : monthlyDay === 3 || monthlyDay === 23
              ? 'rd'
              : 'th'}
        </p>
      ) : null}
      {weekdayNotice ? (
        <p className="text-xs text-muted">Repeats Monday through Friday.</p>
      ) : null}
      {error ? <span className="text-xs text-red-400">{error}</span> : null}
      <Button
        onClick={submit}
        disabled={submitting || !title || !projectName || !xAccount || !startsAt}
      >
        {submitting ? 'Adding…' : 'Add to Wall'}
      </Button>
    </div>
  );
}
