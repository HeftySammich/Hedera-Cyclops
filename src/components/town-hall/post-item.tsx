'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useWallet } from '@/components/wallet/wallet-context';
import { Avatar } from '@/components/ascii/avatar';
import { ConfirmDialog } from '@/components/ascii/confirm-dialog';
import { userDisplayName } from '@/lib/display-name';

export interface PostAuthor {
  id: string;
  username: string | null;
  walletAddress: string;
  pfpSerial: number | null;
  pfpImageUrl: string | null;
}

export interface PostData {
  id: string;
  body: string;
  imageUrls: string[];
  parentId: string | null;
  createdAt: string;
  author: PostAuthor;
  _count: { likes: number; replies?: number };
}

export function PostItem({
  post,
  onLike,
  onDelete,
  showThreadLink = true,
}: {
  post: PostData;
  onLike: (postId: string) => void;
  onDelete?: (postId: string) => void;
  showThreadLink?: boolean;
}) {
  const { user, holdsCollection } = useWallet();
  const canAct = Boolean(user && holdsCollection);
  const canDelete = Boolean(user && (user.id === post.author.id || user.isAdmin));
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  return (
    <article className="border border-neutral-800 p-3">
      <header className="flex items-center justify-between text-xs text-muted">
        <div className="flex items-center gap-2">
          <Avatar
            src={post.author.pfpImageUrl}
            alt={userDisplayName(post.author.username, post.author.walletAddress)}
            size={40}
          />
          <span className="text-sage">
            {userDisplayName(post.author.username, post.author.walletAddress)}
          </span>
        </div>
        <time dateTime={post.createdAt}>{new Date(post.createdAt).toLocaleString()}</time>
      </header>
      <p
        className="mt-2 whitespace-pre-wrap text-sm text-ink"
        dangerouslySetInnerHTML={{ __html: post.body }}
      />
      {post.imageUrls.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-2">
          {post.imageUrls.map((url) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={url} src={url} alt="" className="h-24 w-24 object-cover" />
          ))}
        </div>
      ) : null}
      <footer className="mt-2 flex items-center gap-4 text-xs text-muted">
        <button
          onClick={() => onLike(post.id)}
          disabled={!canAct}
          className="hover:text-sage disabled:cursor-not-allowed"
        >
          ♥ {post._count.likes}
        </button>
        {showThreadLink ? (
          <Link href={`/town-hall/${post.id}`} className="hover:text-sage">
            {post._count.replies ?? 0} replies
          </Link>
        ) : null}
        {canDelete && onDelete ? (
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="ml-auto hover:text-red-400"
          >
            delete
          </button>
        ) : null}
      </footer>
      <ConfirmDialog
        open={deleteConfirmOpen}
        title="Delete post"
        message="Are you sure you want to delete this post?"
        confirmLabel="Delete"
        cancelLabel="Cancel"
        onConfirm={() => {
          setDeleteConfirmOpen(false);
          onDelete?.(post.id);
        }}
        onCancel={() => setDeleteConfirmOpen(false)}
      />
    </article>
  );
}
