'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { PostComposer } from './post-composer';
import { PostItem, type PostData } from './post-item';

export function TownHallFeed() {
  const [posts, setPosts] = useState<PostData[]>([]);
  const [loading, setLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  const loadPosts = useCallback(async () => {
    const res = await fetch('/api/posts');
    const data = await res.json();
    setPosts(data.posts ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadPosts();
  }, [loadPosts]);

  useEffect(() => {
    const socket = io({ path: '/api/socket' });
    socketRef.current = socket;
    socket.emit('join', 'town-hall');

    socket.on('post:created', (payload: { id: string; parentId: string | null }) => {
      if (payload.parentId) return; // thread pages handle their own replies
      loadPosts();
    });
    socket.on('post:deleted', (payload: { id: string; parentId: string | null }) => {
      if (payload.parentId) return;
      setPosts((prev) => prev.filter((p) => p.id !== payload.id));
    });
    socket.on('like:changed', (payload: { postId: string; likeCount: number }) => {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === payload.postId ? { ...p, _count: { ...p._count, likes: payload.likeCount } } : p
        )
      );
    });

    return () => {
      socket.emit('leave', 'town-hall');
      socket.disconnect();
    };
  }, [loadPosts]);

  async function handleLike(postId: string) {
    await fetch(`/api/posts/${postId}/like`, { method: 'POST' });
  }

  async function handleDelete(postId: string) {
    const res = await fetch(`/api/posts/${postId}`, { method: 'DELETE' });
    if (res.ok) {
      setPosts((prev) => prev.filter((p) => p.id !== postId));
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <PostComposer onPosted={loadPosts} />
      {loading ? (
        <p className="text-sm text-muted">Loading feed…</p>
      ) : posts.length === 0 ? (
        <p className="text-sm text-muted">No posts yet. Be the first to speak.</p>
      ) : (
        posts.map((post) => (
          <PostItem key={post.id} post={post} onLike={handleLike} onDelete={handleDelete} />
        ))
      )}
    </div>
  );
}
