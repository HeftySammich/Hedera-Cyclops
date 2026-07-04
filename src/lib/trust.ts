// The Ledger's trust model: one wallet = one vouch per project, every vouch
// carries equal weight (anti-Sybil — no reputation multipliers, no staking).
// The "trust score" is simply the distinct-voucher count; tiers are just a
// friendlier presentation of that number and carry no functional gating.

export interface TrustTier {
  key: 'unverified' | 'vouched' | 'trusted' | 'highly_trusted';
  label: string;
  minVouches: number;
}

export const TRUST_TIERS: TrustTier[] = [
  { key: 'unverified', label: 'Unverified', minVouches: 0 },
  { key: 'vouched', label: 'Vouched', minVouches: 1 },
  { key: 'trusted', label: 'Trusted', minVouches: 5 },
  { key: 'highly_trusted', label: 'Highly Trusted', minVouches: 15 },
];

export function trustScore(vouchCount: number): number {
  return Math.max(0, vouchCount);
}

export function trustTierFor(vouchCount: number): TrustTier {
  let tier = TRUST_TIERS[0];
  for (const candidate of TRUST_TIERS) {
    if (vouchCount >= candidate.minVouches) tier = candidate;
  }
  return tier;
}

export interface ProjectWithVouches {
  id: string;
  vouches: { voucherId: string }[];
}

export interface ProjectTrustSummary {
  projectId: string;
  vouchCount: number;
  score: number;
  tier: TrustTier;
}

export function summarizeProjectTrust(project: ProjectWithVouches): ProjectTrustSummary {
  // Distinct voucher count — the unique @@constraint already guarantees this
  // at the DB level, but we defend here too in case callers pass raw data.
  const distinctVouchers = new Set(project.vouches.map((v) => v.voucherId));
  const vouchCount = distinctVouchers.size;
  return {
    projectId: project.id,
    vouchCount,
    score: trustScore(vouchCount),
    tier: trustTierFor(vouchCount),
  };
}

export function sortProjectsByTrust<T extends ProjectWithVouches>(projects: T[]): T[] {
  return [...projects].sort((a, b) => {
    const scoreA = summarizeProjectTrust(a).score;
    const scoreB = summarizeProjectTrust(b).score;
    return scoreB - scoreA;
  });
}
