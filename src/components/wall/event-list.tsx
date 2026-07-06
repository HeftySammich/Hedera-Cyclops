'use client';

import { useCallback, useEffect, useState } from 'react';
import { format } from 'date-fns';
import { useWallet } from '@/components/wallet/wallet-context';
import { Avatar } from '@/components/ascii/avatar';
import { userDisplayName } from '@/lib/display-name';
import { EventForm } from './event-form';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatTime(date: Date): string {
  return format(date, 'h:mm a');
}

function formatRecurrence(event: WallEvent): string {
  const time = formatTime(new Date(event.startsAt));
  if (!event.recurring) {
    return format(new Date(event.startsAt), "MMM d, yyyy 'at' h:mm a");
  }
  const freq = event.recurrenceFrequency;
  if (freq === 'weekdays') {
    return `Monday – Friday at ${time}`;
  }
  if (freq === 'monthly') {
    const day = new Date(event.startsAt).getDate();
    const suffix =
      day === 1 || day === 21 || day === 31
        ? 'st'
        : day === 2 || day === 22
          ? 'nd'
          : day === 3 || day === 23
            ? 'rd'
            : 'th';
    return `Monthly on the ${day}${suffix} at ${time}`;
  }
  if (event.dayOfWeek == null) {
    return format(new Date(event.startsAt), "MMM d, yyyy 'at' h:mm a");
  }
  const dayName = DAYS[event.dayOfWeek];
  if (freq === 'biweekly') return `Every other ${dayName} at ${time}`;
  return `Every ${dayName} at ${time}`;
}

type RecurrenceFrequency = 'weekly' | 'biweekly' | 'monthly' | 'weekdays';

interface WallEvent {
  id: string;
  title: string;
  projectName: string;
  xAccount: string;
  startsAt: string;
  recurring: boolean;
  recurrenceFrequency: RecurrenceFrequency | null;
  dayOfWeek: number | null;
  ownerId: string;
  owner: { username: string | null; walletAddress: string; pfpImageUrl: string | null };
}

export function EventList() {
  const { user } = useWallet();
  const [events, setEvents] = useState<WallEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const res = await fetch('/api/wall-events');
    const data = await res.json();
    setEvents(data.events ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function remove(id: string) {
    await fetch(`/api/wall-events/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="flex flex-col gap-6">
      <EventForm onCreated={load} />
      {loading ? (
        <p className="text-sm text-muted">Loading wall…</p>
      ) : events.length === 0 ? (
        <p className="text-sm text-muted">No events on the wall yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {events.map((event) => (
            <li key={event.id} className="border border-neutral-800 p-3 text-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar
                    src={event.owner.pfpImageUrl}
                    alt={userDisplayName(event.owner.username, event.owner.walletAddress)}
                  />
                  <span className="text-sage">{event.title}</span>
                </div>
                <span className="text-xs text-muted">
                  {formatRecurrence(event)}
                </span>
              </div>
              <p className="mt-1 text-xs text-muted">{event.projectName}</p>
              <div className="mt-2 flex items-center justify-between text-xs">
                <a
                  href={`https://x.com/${event.xAccount.replace(/^@/, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-muted underline hover:text-sage"
                >
                  @{event.xAccount.replace(/^@/, '')}
                </a>
                {user && (user.id === event.ownerId || user.isAdmin) ? (
                  <button onClick={() => remove(event.id)} className="text-muted hover:text-sage">
                    remove
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
