import type { Metadata } from 'next';
import { IBM_Plex_Mono } from 'next/font/google';
import './globals.css';
import { WalletProvider } from '@/components/wallet/wallet-context';
import { Nav } from '@/components/nav/nav';
import { MetricsSection } from '@/components/home/metrics-section';

const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hedera Cyclops',
  description: 'Anonymous, community-first PFP project on Hedera.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={mono.variable}>
      <body className="font-mono">
        <div className="crt-overlay" aria-hidden="true" />
        <div className="crt-vignette" aria-hidden="true" />
        <WalletProvider>
          <Nav />
          <main className="mx-auto max-w-5xl px-4 py-8">
            {children}
            <div className="mt-8">
              <MetricsSection />
            </div>
          </main>
        </WalletProvider>
      </body>
    </html>
  );
}
