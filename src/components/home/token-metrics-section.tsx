'use client';

import { useEffect, useState } from 'react';
import { Panel } from '@/components/ascii/panel';
import type { TokenMetrics } from '@/lib/token-metrics';

function formatCount(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  if (value < 1000) {
    return new Intl.NumberFormat('en-US', {
      maximumFractionDigits: 0,
    }).format(value);
  }
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value);
}

function formatHbar(value: number | undefined | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${new Intl.NumberFormat('en-US', {
    notation: 'compact',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} HBAR`;
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

export function TokenMetricsSection() {
  const [metrics, setMetrics] = useState<TokenMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/token-metrics')
      .then((res) => res.json())
      .then((data: { metrics: TokenMetrics }) => setMetrics(data.metrics))
      .catch(() => setMetrics(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <Panel title="Hedera Cyclops">
        <p className="text-sm text-muted">Loading collection metrics…</p>
      </Panel>
    );
  }

  if (!metrics) {
    return (
      <Panel title="Hedera Cyclops">
        <p className="text-sm text-muted">Collection metrics unavailable right now.</p>
      </Panel>
    );
  }

  const remaining =
    metrics.maxSupply != null && metrics.minted != null
      ? Math.max(0, metrics.maxSupply - metrics.minted)
      : null;

  return (
    <Panel title="Hedera Cyclops">
      <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
        <MetricCard label="Token ID" value={metrics.tokenId} />
        <MetricCard label="Treasury" value={metrics.treasury ?? '—'} />
        <MetricCard label="Max Supply" value={formatCount(metrics.maxSupply)} />
        <MetricCard
          label="Minted"
          value={formatCount(metrics.minted)}
          sub={remaining != null ? `${formatCount(remaining)} remaining` : undefined}
        />
        <MetricCard label="Holders" value={formatCount(metrics.holders)} />
        <MetricCard
          label="Keys"
          value={metrics.keys.length > 0 ? metrics.keys.join(', ') : '—'}
        />
        {metrics.mintVolume24hHbar != null ? (
          <MetricCard label="24h Mint Volume" value={formatHbar(metrics.mintVolume24hHbar)} />
        ) : metrics.mints24h != null ? (
          <MetricCard label="24h Mints" value={formatCount(metrics.mints24h)} />
        ) : null}
      </div>
    </Panel>
  );
}
