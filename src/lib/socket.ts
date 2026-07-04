import type { Server as IOServer } from 'socket.io';

// server.js attaches the Socket.IO server instance to globalThis so that API
// route handlers running in the same long-lived Node process can emit
// real-time events without a second network hop. In environments where the
// custom server hasn't started yet (e.g. some test setups) this is undefined
// and emits become safe no-ops.

export const TOWN_HALL_ROOM = 'town-hall';

export function threadRoom(postId: string): string {
  return `thread:${postId}`;
}

function getIO(): IOServer | undefined {
  return (globalThis as unknown as { __townHallIO?: IOServer }).__townHallIO;
}

export interface PostCreatedPayload {
  id: string;
  parentId: string | null;
  authorId: string;
  body: string;
  imageUrls: string[];
  createdAt: string;
}

export interface PostDeletedPayload {
  id: string;
  parentId: string | null;
}

export interface LikeChangedPayload {
  postId: string;
  likeCount: number;
}

/** Broadcast a new post to the Town Hall feed, and to the parent thread's
 * room if it's a reply. Never throws — real-time updates are a nice-to-have,
 * not something that should break the underlying write on failure. */
export function emitPostCreated(payload: PostCreatedPayload): void {
  const io = getIO();
  if (!io) return;
  try {
    io.to(TOWN_HALL_ROOM).emit('post:created', payload);
    if (payload.parentId) io.to(threadRoom(payload.parentId)).emit('post:created', payload);
  } catch {
    // best-effort only
  }
}

export function emitPostDeleted(payload: PostDeletedPayload): void {
  const io = getIO();
  if (!io) return;
  try {
    io.to(TOWN_HALL_ROOM).emit('post:deleted', payload);
    if (payload.parentId) io.to(threadRoom(payload.parentId)).emit('post:deleted', payload);
  } catch {
    // best-effort only
  }
}

export function emitLikeChanged(payload: LikeChangedPayload, parentId: string | null): void {
  const io = getIO();
  if (!io) return;
  try {
    io.to(TOWN_HALL_ROOM).emit('like:changed', payload);
    if (parentId) io.to(threadRoom(parentId)).emit('like:changed', payload);
  } catch {
    // best-effort only
  }
}
