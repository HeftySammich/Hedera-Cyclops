import { clsx } from 'clsx';
import type { ButtonHTMLAttributes } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'ghost';
}

export function Button({ variant = 'primary', className, children, ...props }: ButtonProps) {
  return (
    <button
      className={clsx(
        'inline-flex items-center gap-2 border px-3 py-1.5 font-mono text-sm uppercase tracking-wide transition-colors disabled:cursor-not-allowed disabled:opacity-40',
        variant === 'primary'
          ? 'border-sage text-sage hover:bg-sage hover:text-base'
          : 'border-neutral-700 text-ink hover:border-sage hover:text-sage',
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
