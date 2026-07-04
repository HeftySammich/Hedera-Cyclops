import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

export interface PanelProps extends HTMLAttributes<HTMLDivElement> {
  title?: string;
}

/** A bordered panel with a small ASCII-style title tab, used throughout the
 * site as the base "card" surface. */
export function Panel({ title, className, children, ...props }: PanelProps) {
  return (
    <div
      className={clsx('relative border border-neutral-700 bg-panel px-4 py-4', className)}
      {...props}
    >
      {title ? (
        <div className="absolute -top-3 left-3 bg-panel px-2 text-xs uppercase tracking-widest text-sage">
          [ {title} ]
        </div>
      ) : null}
      {children}
    </div>
  );
}
