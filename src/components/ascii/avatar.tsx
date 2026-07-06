'use client';

import Image from 'next/image';

interface AvatarProps {
  src: string | null | undefined;
  alt: string;
  size?: number;
  className?: string;
}

export function Avatar({ src, alt, size = 40, className = '' }: AvatarProps) {
  const style = { width: size, height: size };
  if (!src) {
    return (
      <div
        className={`flex shrink-0 items-center justify-center rounded-full border border-neutral-700 bg-base text-[10px] uppercase text-muted ${className}`}
        style={style}
        aria-label={alt}
      >
        {alt ? alt.charAt(0) : '?'}
      </div>
    );
  }

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full border border-neutral-700 bg-neutral-900 ${className}`}
      style={style}
    >
      <Image
        src={src}
        alt={alt}
        fill
        className="object-cover"
        unoptimized
        sizes={`${size}px`}
      />
    </div>
  );
}
