'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { clsx } from 'clsx';
import { ConnectButton } from '@/components/wallet/connect-button';

const LINKS = [
  { href: '/', label: 'Home' },
  { href: '/collection', label: 'Collection' },
  { href: '/town-hall', label: 'Town Hall' },
  { href: '/the-wall', label: 'The Wall' },
  { href: '/the-ledger', label: 'The Ledger' },
  { href: '/profile', label: 'Profile' },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="sticky top-0 z-40 border-b border-neutral-800 bg-base/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="font-mono text-sm uppercase tracking-widest text-sage">
          Hedera_Cyclops//
        </Link>
        <div className="flex flex-wrap items-center gap-4 font-mono text-xs uppercase tracking-wide">
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
        <ConnectButton />
      </div>
    </nav>
  );
}
