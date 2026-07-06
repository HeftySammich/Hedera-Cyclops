'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ascii/panel';
import type { HomeMetrics } from '@/lib/hedera-metrics';

function formatCurrency(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(value);
}

function formatNumber(value: number | undefined, decimals = 3): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

function formatHbar(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${formatNumber(value, 3)} HBAR`;
}

function formatPercent(value: number | undefined): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(3)}%`;
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
}) {
  return (
    <div className="border border-neutral-800 p-3">
      <div className="text-xs uppercase text-muted">{label}</div>
      <div className="mt-1 text-lg text-sage">{value}</div>
      {sub ? <div className="mt-0.5 text-[10px] text-muted">{sub}</div> : null}
    </div>
  );
}

export function MetricsSection() {
  const [metrics, setMetrics] = useState<HomeMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/metrics')
      .then((res) => res.json())
      .then((data: HomeMetrics) => setMetrics(data))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Panel title="Hedera Network">
        <p className="text-sm text-muted">Loading network metrics…</p>
      </Panel>
    );
  }

  if (!metrics) {
    return (
      <Panel title="Hedera Network">
        <p className="text-sm text-muted">Network metrics unavailable right now.</p>
      </Panel>
    );
  }

  const { hbar, network, hgraph } = metrics;

  return (
    <Panel title="Hedera Network">
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        {hbar ? (
          <>
            <MetricCard label="HBAR Price" value={formatCurrency(hbar.price)} />
            <MetricCard
              label="Market Cap"
              value={formatCurrency(hbar.marketCap)}
              sub={hbar.change24h != null ? `24h ${formatPercent(hbar.change24h)}` : undefined}
            />
            {hbar.volume24h != null ? (
              <MetricCard label="24h Volume" value={formatCurrency(hbar.volume24h)} />
            ) : null}
          </>
        ) : null}

        {network ? (
          <>
            <MetricCard label="Live TPS" value={formatNumber(network.tps, 3)} />
            <MetricCard label="Block Height" value={formatNumber(network.blockHeight, 0)} />
            <MetricCard label="Consensus Nodes" value={network.nodeCount.toString()} />
            <MetricCard label="Total Stake" value={formatHbar(network.totalStakeHb)} />
          </>
        ) : null}

        {hgraph ? (
          <>
            {hgraph.tvl != null ? (
              <MetricCard label="DeFi TVL" value={formatCurrency(hgraph.tvl)} />
            ) : null}
            {hgraph.stablecoinMarketcap != null ? (
              <MetricCard
                label="Stablecoin Mcap"
                value={formatCurrency(hgraph.stablecoinMarketcap)}
              />
            ) : null}
            {hgraph.avgTimeToConsensus != null ? (
              <MetricCard
                label="Avg Time to Consensus"
                value={`${hgraph.avgTimeToConsensus.toFixed(3)} s`}
              />
            ) : null}
            {hgraph.newAccounts24h != null ? (
              <MetricCard label="New Accounts (24h)" value={formatNumber(hgraph.newAccounts24h, 0)} />
            ) : null}
            {hgraph.networkFee24hHb != null ? (
              <MetricCard label="Network Fees (24h)" value={formatHbar(hgraph.networkFee24hHb)} />
            ) : null}
          </>
        ) : null}
      </div>
    </Panel>
  );
}
