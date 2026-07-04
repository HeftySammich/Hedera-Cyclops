'use client';

import { useState } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Button } from '@/components/ascii/button';
import { HolderGate } from '@/components/gating/holder-gate';

export function PostComposer({
  parentId = null,
  onPosted,
  placeholder = "What's happening, anon?",
}: {
  parentId?: string | null;
  onPosted?: () => void;
  placeholder?: string;
}) {
  const { user, holdsCollection } = useWallet();
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!user || !holdsCollection) return <HolderGate>{null}</HolderGate>;

  async function submit() {
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, parentId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to post.');
      }
      setBody('');
      onPosted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to post.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="border border-neutral-800 p-3">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={3}
        maxLength={4000}
        className="w-full resize-none border border-neutral-700 bg-base px-2 py-1 text-sm text-ink placeholder:text-muted"
      />
      <div className="mt-2 flex items-center justify-between">
        {error ? <span className="text-xs text-red-400">{error}</span> : <span />}
        <Button onClick={submit} disabled={submitting || !body.trim()}>
          {submitting ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </div>
  );
}
