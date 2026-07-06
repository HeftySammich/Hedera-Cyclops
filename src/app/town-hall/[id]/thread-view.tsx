'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { io } from 'socket.io-client';
import Link from 'next/link';
import { Prompt } from '@/components/ascii/prompt';
import { PostComposer } from '@/components/town-hall/post-composer';
import { PostItem, type PostData } from '@/components/town-hall/post-item';

export function ThreadView({ postId }: { postId: string }) {
  const router = useRouter();
  const [post, setPost] = useState<PostData | null>(null);
  const [replies, setReplies] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/posts/${postId}`);
    if (!res.ok) {
      setNotFound(true);
      setLoading(false);
      return;
    }
    const data = await res.json();
    setPost(data.post);
    setReplies(data.replies ?? []);
    setLoading(false);
  }, [postId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const room = `thread:${postId}`;
    const socket = io({ path: '/api/socket' });
    socket.emit('join', room);
    socket.on('post:created', () => load());
    socket.on('post:deleted', (payload: { id: string }) => {
      setReplies((prev) => prev.filter((r) => r.id !== payload.id));
    });
    socket.on('like:changed', (payload: { postId: string; likeCount: number }) => {
      setReplies((prev) =>
        prev.map((r) =>
          r.id === payload.postId ? { ...r, _count: { ...r._count, likes: payload.likeCount } } : r
        )
      );
    });
    return () => {
      socket.emit('leave', room);
      socket.disconnect();
    };
  }, [postId, load]);

  async function handleLike(id: string) {
    await fetch(`/api/posts/${id}/like`, { method: 'POST' });
  }

  async function handleDelete(id: string) {
    const res = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
    if (!res.ok) return;
    if (post?.id === id) {
      router.push('/town-hall');
    } else {
      setReplies((prev) => prev.filter((r) => r.id !== id));
    }
  }

  if (loading) return <p className="text-sm text-muted">Loading thread…</p>;
  if (notFound || !post) return <p className="text-sm text-muted">Post not found.</p>;

  return (
    <div className="flex flex-col gap-4">
      <Link href="/town-hall" className="text-xs text-muted hover:text-sage">
        {'< back to town hall'}
      </Link>
      <Prompt>thread</Prompt>
      <PostItem post={post} onLike={handleLike} onDelete={handleDelete} showThreadLink={false} />
      <PostComposer parentId={postId} onPosted={load} placeholder="Reply to this post…" />
      <div className="flex flex-col gap-3 border-t border-neutral-800 pt-4">
        {replies.map((reply) => (
          <PostItem
            key={reply.id}
            post={reply}
            onLike={handleLike}
            onDelete={handleDelete}
            showThreadLink={false}
          />
        ))}
      </div>
    </div>
  );
}
