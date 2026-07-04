import { clsx } from 'clsx';
import type { HTMLAttributes } from 'react';

/** A terminal-prompt-styled line: "> some text", with a blinking cursor
 * suffix when `live` is set. Used for section headers / status lines. */
export function Prompt({
  children,
  live,
  className,
  ...props
}: HTMLAttributes<HTMLDivElement> & { live?: boolean }) {
  return (
    <div className={clsx('font-mono text-sm text-sage', className)} {...props}>
      <span className="text-muted">{'> '}</span>
      {children}
      {live ? <span className="ml-1 animate-blink text-sage">▌</span> : null}
    </div>
  );
}
