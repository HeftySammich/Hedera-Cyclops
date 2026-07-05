'use client';

import { useState, useRef } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Button } from '@/components/ascii/button';
import { HolderGate } from '@/components/gating/holder-gate';
import { ALLOWED_UPLOAD_MIME_TYPES, MAX_UPLOAD_BYTES } from '@/lib/upload';

const MAX_IMAGES = 4;

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

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
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  if (!user || !holdsCollection) return <HolderGate>{null}</HolderGate>;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    if (selected.length === 0) return;

    const next = [...files, ...selected].slice(0, MAX_IMAGES);
    if (next.length < files.length + selected.length) {
      setError(`You can attach up to ${MAX_IMAGES} images.`);
    }

    setFiles(next);
    setPreviews(next.map((f) => URL.createObjectURL(f)));
    if (inputRef.current) inputRef.current.value = '';
  }

  function removeFile(index: number) {
    URL.revokeObjectURL(previews[index]);
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  }

  async function uploadImages(): Promise<string[]> {
    if (files.length === 0) return [];
    const urls: string[] = [];
    for (const file of files) {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/uploads', { method: 'POST', body: form });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? `Upload failed for ${file.name}.`);
      }
      const { url } = await res.json();
      urls.push(url);
    }
    return urls;
  }

  async function submit() {
    if ((!body.trim() && files.length === 0) || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const imageUrls = await uploadImages();
      const res = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body, parentId, imageUrls }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to post.');
      }
      setBody('');
      previews.forEach(URL.revokeObjectURL);
      setFiles([]);
      setPreviews([]);
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

      {previews.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {previews.map((src, i) => (
            <div key={src} className="relative h-20 w-20 border border-neutral-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={src} alt="" className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeFile(i)}
                className="absolute right-0 top-0 bg-base px-1 text-xs text-red-400 hover:text-red-300"
                aria-label="Remove image"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={files.length >= MAX_IMAGES || submitting}
            className="text-xs text-sage hover:text-terminal disabled:text-muted"
          >
            + image/gif
          </button>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_UPLOAD_MIME_TYPES.join(',')}
            multiple
            className="hidden"
            onChange={handleFileChange}
          />
          <span className="text-[10px] text-muted">
            {files.length}/{MAX_IMAGES} · max {formatBytes(MAX_UPLOAD_BYTES)}
          </span>
        </div>
        {error ? <span className="text-xs text-red-400">{error}</span> : <span />}
        <Button onClick={submit} disabled={submitting || (!body.trim() && files.length === 0)}>
          {submitting ? 'Posting…' : 'Post'}
        </Button>
      </div>
    </div>
  );
}
