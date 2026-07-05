import Link from 'next/link';
import { env } from '@/lib/env';
import { getMintedCount } from '@/lib/nft';
import { Panel } from '@/components/ascii/panel';
import { Prompt } from '@/components/ascii/prompt';
import { Button } from '@/components/ascii/button';

export const revalidate = 30;

function phaseSubtitle(name: string): string {
  switch (name.trim()) {
    case 'Phase 1':
      return '1,500 Cyclopes';
    case 'Phase 2':
      return '1,500 Female Cyclopes';
    case 'Phase 3':
      return '333 Custom Cyclopes';
    default:
      return '';
  }
}

export default async function HomePage() {
  const minted = await getMintedCount();
  const pct = env.totalSupply > 0 ? Math.min(100, Math.round((minted / env.totalSupply) * 100)) : 0;

  return (
    <div className="flex flex-col gap-8">
      <section className="text-center">
        <Prompt live className="justify-center text-base">
          watching the chain for movement
        </Prompt>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-ink sm:text-5xl">
          Hedera Cyclops
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm text-muted">
          An anonymously developed, community-first NFT collection on Hedera Hashgraph. No teams, no
          faces - just holders.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link href="/collection">
            <Button>View Collection</Button>
          </Link>
          <Link href="/town-hall">
            <Button variant="ghost">Enter Town Hall</Button>
          </Link>
        </div>
      </section>

      <Panel title="Mint Progress">
        <div className="flex items-center justify-between font-mono text-xs text-muted">
          <span>{minted.toLocaleString()} minted</span>
          <span>{env.totalSupply.toLocaleString()} supply</span>
        </div>
        <div className="mt-2 h-2 w-full border border-neutral-700">
          <div className="h-full bg-sage" style={{ width: `${pct}%` }} />
        </div>
        {env.phases.length > 0 ? (
          <ul className="mt-4 grid gap-2 sm:grid-cols-3">
            {env.phases.map((phase) => (
              <li key={phase.name} className="border border-neutral-800 px-3 py-2 text-xs">
                <div className="text-sage">{phase.name}</div>
                <div className="text-muted">{phaseSubtitle(phase.name)}</div>
              </li>
            ))}
          </ul>
        ) : null}
      </Panel>

      <Panel title="About the Collection">
        <p className="text-sm text-muted">
          There are no “rare” traits in the traditional sense - no zombie skins, no gold editions,
          no artificially pumped rarities. Base trait distribution is balanced across the board,
          with the exception of the final 333 Custom Cyclopes. Every Cyclops is a valid key into the
          community. The PFP is your access pass: hold one, sign in with your Hedera wallet, and
          engage in the Town Hall, The Ledger, and The Wall.
        </p>
      </Panel>

      <div className="grid gap-4 sm:grid-cols-2">
        <Panel title="Town Hall">
          <p className="text-sm text-muted">Live, holder-gated forum. Post, reply, and like.</p>
        </Panel>
        <Panel title="The Ledger">
          <p className="text-sm text-muted">
            A trust registry for Hedera projects - one wallet, one vouch.
          </p>
        </Panel>
        <Panel title="The Wall">
          <p className="text-sm text-muted">A calendar of community X Spaces and events.</p>
        </Panel>
        <Panel title="Collection">
          <p className="text-sm text-muted">Browse every Cyclops and filter by trait.</p>
        </Panel>
      </div>
    </div>
  );
}
