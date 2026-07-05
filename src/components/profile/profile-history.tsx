'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ascii/panel';
import { Button } from '@/components/ascii/button';
import { PostItem, type PostData } from '@/components/town-hall/post-item';

interface VouchData {
  id: string;
  comment: string | null;
  createdAt: string;
  project: {
    id: string;
    name: string;
    xHandle: string | null;
    website: string | null;
    description: string;
    submittedBy: { username: string | null; walletAddress: string };
    _count: { vouches: number };
  };
}

export function ProfileHistory() {
  const [tab, setTab] = useState<'posts' | 'vouches'>('posts');
  const [posts, setPosts] = useState<PostData[] | null>(null);
  const [vouches, setVouches] = useState<VouchData[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    Promise.all([
      fetch('/api/profile/posts').then((r) => r.json()),
      fetch('/api/profile/vouches').then((r) => r.json()),
    ])
      .then(([p, v]) => {
        if (cancelled) return;
        setPosts(p.posts ?? []);
        setVouches(v.vouches ?? []);
      })
      .catch(() => setError('Could not load history.'))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleLike(postId: string) {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
  }

  if (loading) return <Panel title="History"><p className="text-sm text-muted">Loading…</p></Panel>;
  if (error) return <Panel title="History"><p className="text-sm text-red-400">{error}</p></Panel>;

  return (
    <Panel title="History">
      <div className="mb-3 flex gap-2 border-b border-neutral-800 pb-2">
        <button
          onClick={() => setTab('posts')}
          className={`text-xs uppercase ${tab === 'posts' ? 'text-sage' : 'text-muted'}`}
        >
          Posts ({posts?.length ?? 0})
        </button>
        <button
          onClick={() => setTab('vouches')}
          className={`text-xs uppercase ${tab === 'vouches' ? 'text-sage' : 'text-muted'}`}
        >
          Vouches ({vouches?.length ?? 0})
        </button>
      </div>

      {tab === 'posts' ? (
        posts && posts.length > 0 ? (
          <div className="flex flex-col gap-3">
            {posts.map((post) => (
              <PostItem key={post.id} post={post} onLike={handleLike} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">No Town Hall posts yet.</p>
        )
      ) : vouches && vouches.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {vouches.map((vouch) => (
            <li key={vouch.id} className="border border-neutral-800 p-2">
              <div className="text-sm text-ink">{vouch.project.name}</div>
              {vouch.comment ? (
                <p className="mt-1 text-xs text-muted">{vouch.comment}</p>
              ) : null}
              <div className="mt-1 text-[10px] text-muted">
                {vouch.project._count.vouches} vouch{vouch.project._count.vouches === 1 ? '' : 'es'} ·{' '}
                {new Date(vouch.createdAt).toLocaleString()}
              </div>
              {vouch.project.website ? (
                <a
                  href={vouch.project.website}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-[10px] text-sage hover:underline"
                >
                  website
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted">No project vouches yet.</p>
      )}
    </Panel>
  );
}
