'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ConnectButton } from '@/components/wallet/connect-button';
import { Button } from '@/components/ascii/button';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/collection', label: 'Collection' },
  { href: '/town-hall', label: 'Town Hall' },
  { href: '/the-wall', label: 'The Wall' },
  { href: '/the-ledger', label: 'The Ledger' },
  { href: '/profile', label: 'Profile' },
];

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="flex h-4 w-5 flex-col justify-between">
      <span
        className={clsx(
          'h-0.5 w-full bg-ink transition-transform duration-200',
          open && 'translate-y-[7px] rotate-45'
        )}
      />
      <span
        className={clsx(
          'h-0.5 w-full bg-ink transition-opacity duration-200',
          open && 'opacity-0'
        )}
      />
      <span
        className={clsx(
          'h-0.5 w-full bg-ink transition-transform duration-200',
          open && '-translate-y-[7px] -rotate-45'
        )}
      />
    </div>
  );
}

export function Nav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  function close() {
    setOpen(false);
  }

  return (
    <>
      <nav className="sticky top-0 z-40 border-b border-neutral-800 bg-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="font-mono text-sm uppercase tracking-widest text-sage">
            Hedera_Cyclops//
          </Link>

          {/* Desktop links */}
          <div className="hidden items-center gap-4 font-mono text-xs uppercase tracking-wide md:flex">
            {LINKS.slice(1).map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'transition-colors hover:text-sage',
                  pathname === link.href ? 'text-sage' : 'text-muted'
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Desktop connect */}
          <div className="hidden md:block">
            <ConnectButton />
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="p-1 md:hidden"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
          >
            <HamburgerIcon open={open} />
          </button>
        </div>
      </nav>

      {/* Mobile slide-out drawer */}
      <div
        className={clsx(
          'fixed inset-0 z-50 bg-black/60 transition-opacity duration-200 md:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={close}
        aria-hidden={!open}
      />
      <aside
        className={clsx(
          'fixed right-0 top-0 z-50 flex h-full w-64 flex-col border-l border-neutral-800 bg-base p-4 shadow-xl transition-transform duration-200 md:hidden',
          open ? 'translate-x-0' : 'translate-x-full'
        )}
        aria-label="Mobile navigation"
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-widest text-sage">Menu</span>
          <button
            type="button"
            onClick={close}
            className="p-1 text-muted hover:text-ink"
            aria-label="Close menu"
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-1 font-mono text-sm uppercase tracking-wide">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={close}
              className={clsx(
                'border-b border-neutral-800 py-3 transition-colors hover:text-sage',
                pathname === link.href ? 'text-sage' : 'text-muted'
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>

        <div className="mt-auto pt-6">
          <ConnectButton />
        </div>
      </aside>
    </>
  );
}
