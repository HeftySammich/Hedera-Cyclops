import { unstable_cache } from 'next/cache';
import { env } from './env';
import { fetchWithRetry } from './fetch-retry';

export interface HbarMarketData {
  price: number;
  marketCap: number;
  volume24h: number;
  change24h: number;
}

export interface HederaNetworkMetrics {
  tps: number;
  blockHeight: number;
  nodeCount: number;
  totalStakeHb: number;
}

export interface HederaStats {
  tvl?: number;
  stablecoinMarketcap?: number;
  avgTimeToConsensus?: number;
  newAccounts24h?: number;
  networkFee24hHb?: number;
}

export interface HomeMetrics {
  hbar: HbarMarketData | null;
  network: HederaNetworkMetrics | null;
  hgraph: HederaStats | null;
}

function asNumber(value: unknown): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : undefined;
}

async function getHbarMarketDataUncached(): Promise<HbarMarketData | null> {
  try {
    const url = new URL(
      'https://api.coingecko.com/api/v3/simple/price'
    );
    url.searchParams.set('ids', 'hedera-hashgraph');
    url.searchParams.set('vs_currencies', 'usd');
    url.searchParams.set('include_market_cap', 'true');
    url.searchParams.set('include_24hr_vol', 'true');
    url.searchParams.set('include_24hr_change', 'true');

    const headers: Record<string, string> = { accept: 'application/json' };
    if (env.coingeckoApiKey) {
      headers['x-cg-demo-api-key'] = env.coingeckoApiKey;
    }

    const res = await fetchWithRetry(url.toString(), { headers });
    if (!res.ok) return null;
    const json = await res.json();
    const data = json['hedera-hashgraph'];
    if (!data) return null;
    return {
      price: asNumber(data.usd) ?? 0,
      marketCap: asNumber(data.usd_market_cap) ?? 0,
      volume24h: asNumber(data.usd_24h_vol) ?? 0,
      change24h: asNumber(data.usd_24h_change) ?? 0,
    };
  } catch {
    return null;
  }
}

interface MirrorBlock {
  number: number;
  count: number;
  timestamp: { from: string; to: string };
}

async function getHederaNetworkMetricsUncached(): Promise<HederaNetworkMetrics | null> {
  try {
    const [blocksRes, nodesRes, stakeRes] = await Promise.all([
      fetchWithRetry(
        `${env.mirrorNodeBaseUrl}/api/v1/blocks?limit=10&order=desc`,
        { headers: { accept: 'application/json' } }
      ),
      fetchWithRetry(
        `${env.mirrorNodeBaseUrl}/api/v1/network/nodes`,
        { headers: { accept: 'application/json' } }
      ),
      fetchWithRetry(
        `${env.mirrorNodeBaseUrl}/api/v1/network/stake`,
        { headers: { accept: 'application/json' } }
      ),
    ]);

    if (!blocksRes.ok || !nodesRes.ok || !stakeRes.ok) return null;

    const blocksJson = await blocksRes.json();
    const blocks: MirrorBlock[] = blocksJson.blocks ?? [];
    if (blocks.length === 0) return null;

    let totalCount = 0;
    let totalDuration = 0;
    for (const block of blocks) {
      totalCount += block.count;
      const from = Number(block.timestamp.from);
      const to = Number(block.timestamp.to);
      if (Number.isFinite(from) && Number.isFinite(to)) {
        totalDuration += to - from;
      }
    }
    const tps = totalDuration > 0 ? totalCount / totalDuration : 0;

    const nodesJson = await nodesRes.json();
    const nodeCount = Array.isArray(nodesJson.nodes) ? nodesJson.nodes.length : 0;

    const stakeJson = await stakeRes.json();
    const stakeTotal = asNumber(stakeJson.stake_total) ?? 0;
    const totalStakeHb = stakeTotal / 100_000_000;

    return {
      tps,
      blockHeight: blocks[0].number,
      nodeCount,
      totalStakeHb,
    };
  } catch {
    return null;
  }
}

interface HgraphMetricRow {
  total: number | string;
  end_date?: string;
}

async function getHederaStatsUncached(): Promise<HederaStats | null> {
  if (!env.hgraphApiKey) return null;

  const query = `
    query HomeStats {
      tvl: ecosystem_metric(
        where: { name: { _eq: "network_tvl" }, period: { _eq: "day" } }
        order_by: { end_date: desc_nulls_last }
        limit: 1
      ) { total }
      stablecoin: ecosystem_metric(
        where: { name: { _eq: "stablecoin_marketcap" }, period: { _eq: "day" } }
        order_by: { end_date: desc_nulls_last }
        limit: 1
      ) { total }
      consensus: ecosystem_metric(
        where: { name: { _eq: "avg_time_to_consensus" }, period: { _eq: "hour" } }
        order_by: { end_date: desc_nulls_last }
        limit: 1
      ) { total }
      newAccounts: ecosystem_metric(
        where: { name: { _eq: "new_accounts" }, period: { _eq: "day" } }
        order_by: { end_date: desc_nulls_last }
        limit: 1
      ) { total }
      fees: ecosystem_metric(
        where: { name: { _eq: "network_fee" }, period: { _eq: "day" } }
        order_by: { end_date: desc_nulls_last }
        limit: 1
      ) { total }
    }
  `;

  try {
    const res = await fetchWithRetry(
      'https://mainnet.hedera.api.hgraph.io/v1/graphql',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': env.hgraphApiKey,
        },
        body: JSON.stringify({ query }),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const data = json.data ?? {};

    const first = (rows: HgraphMetricRow[] | undefined): HgraphMetricRow | undefined =>
      Array.isArray(rows) ? rows[0] : undefined;

    const tvl = asNumber(first(data.tvl)?.total);
    const stablecoin = asNumber(first(data.stablecoin)?.total);
    const consensus = asNumber(first(data.consensus)?.total);
    const newAccounts = asNumber(first(data.newAccounts)?.total);
    const feesTinybar = asNumber(first(data.fees)?.total);

    return {
      tvl,
      stablecoinMarketcap: stablecoin,
      avgTimeToConsensus: consensus,
      newAccounts24h: newAccounts,
      networkFee24hHb: feesTinybar != null ? feesTinybar / 100_000_000 : undefined,
    };
  } catch {
    return null;
  }
}

async function getHomeMetricsUncached(): Promise<HomeMetrics> {
  const [hbar, network, hgraph] = await Promise.all([
    getHbarMarketDataUncached(),
    getHederaNetworkMetricsUncached(),
    getHederaStatsUncached(),
  ]);
  return { hbar, network, hgraph };
}

const HOME_METRICS_TTL_SECONDS = 60;

export const getHomeMetrics = unstable_cache(
  getHomeMetricsUncached,
  ['home-metrics', env.coingeckoApiKey, env.hgraphApiKey],
  { revalidate: HOME_METRICS_TTL_SECONDS }
);
