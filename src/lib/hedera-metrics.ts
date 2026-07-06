import { unstable_cache } from 'next/cache';
import { env } from './env';
import { fetchWithRetry } from './fetch-retry';

export interface HbarMarketData {
  price: number;
  marketCap: number;
  volume24h?: number;
  change24h?: number;
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

const HGRAPH_GRAPHQL_URL = 'https://mainnet.hedera.api.hgraph.io/v1/graphql';

async function hgraphFetch<T>(query: string): Promise<T | null> {
  if (!env.hgraphApiKey) return null;
  try {
    const res = await fetchWithRetry(HGRAPH_GRAPHQL_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': env.hgraphApiKey,
      },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.data ?? null;
  } catch {
    return null;
  }
}

async function getHbarMarketDataUncached(): Promise<HbarMarketData | null> {
  const query = `
    query HbarMarketData {
      price: ecosystem_metric(
        where: { name: { _eq: "avg_usd_conversion" }, period: { _eq: "minute" } }
        order_by: { end_date: desc_nulls_last }
        limit: 1
      ) { total }
      marketCap: ecosystem_metric(
        where: { name: { _eq: "hbar_market_cap" }, period: { _eq: "day" } }
        order_by: { end_date: desc_nulls_last }
        limit: 1
      ) { total }
    }
  `;

  const data = await hgraphFetch<{ price: HgraphMetricRow[]; marketCap: HgraphMetricRow[] }>(query);
  if (!data) return null;

  const priceTotal = asNumber(data.price?.[0]?.total);
  const marketCapTotal = asNumber(data.marketCap?.[0]?.total);

  if (priceTotal == null && marketCapTotal == null) return null;

  return {
    price: priceTotal != null ? priceTotal / 100_000 : 0,
    marketCap: marketCapTotal != null ? marketCapTotal / 100 : 0,
  };
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

  const data = await hgraphFetch<{ tvl: HgraphMetricRow[]; stablecoin: HgraphMetricRow[]; consensus: HgraphMetricRow[]; newAccounts: HgraphMetricRow[]; fees: HgraphMetricRow[] }>(query);
  if (!data) return null;

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
    avgTimeToConsensus: consensus != null ? consensus / 1_000_000_000 : undefined,
    newAccounts24h: newAccounts,
    networkFee24hHb: feesTinybar != null ? feesTinybar / 100_000_000 : undefined,
  };
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
  ['home-metrics', env.hgraphApiKey],
  { revalidate: HOME_METRICS_TTL_SECONDS }
);
