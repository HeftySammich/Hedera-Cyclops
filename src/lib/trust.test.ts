import { describe, expect, it } from 'vitest';
import {
  trustScore,
  trustTierFor,
  summarizeProjectTrust,
  sortProjectsByTrust,
  type ProjectWithVouches,
} from './trust';

describe('trustScore', () => {
  it('never returns a negative score', () => {
    expect(trustScore(-5)).toBe(0);
    expect(trustScore(0)).toBe(0);
    expect(trustScore(7)).toBe(7);
  });
});

describe('trustTierFor', () => {
  it('returns unverified for zero vouches', () => {
    expect(trustTierFor(0).key).toBe('unverified');
  });

  it('returns vouched at the 1-vouch threshold', () => {
    expect(trustTierFor(1).key).toBe('vouched');
    expect(trustTierFor(4).key).toBe('vouched');
  });

  it('returns trusted at the 5-vouch threshold', () => {
    expect(trustTierFor(5).key).toBe('trusted');
    expect(trustTierFor(14).key).toBe('trusted');
  });

  it('returns highly_trusted at the 15-vouch threshold', () => {
    expect(trustTierFor(15).key).toBe('highly_trusted');
    expect(trustTierFor(1000).key).toBe('highly_trusted');
  });
});

function project(id: string, voucherIds: string[]): ProjectWithVouches {
  return { id, vouches: voucherIds.map((voucherId) => ({ voucherId })) };
}

describe('summarizeProjectTrust', () => {
  it('counts distinct vouchers only, ignoring duplicates', () => {
    const summary = summarizeProjectTrust(project('p1', ['a', 'b', 'a']));
    expect(summary.vouchCount).toBe(2);
    expect(summary.score).toBe(2);
    expect(summary.tier.key).toBe('vouched');
  });

  it('handles a project with no vouches', () => {
    const summary = summarizeProjectTrust(project('p2', []));
    expect(summary.vouchCount).toBe(0);
    expect(summary.tier.key).toBe('unverified');
  });
});

describe('sortProjectsByTrust', () => {
  it('sorts projects by descending vouch count without mutating the input', () => {
    const low = project('low', ['a']);
    const high = project('high', ['a', 'b', 'c', 'd', 'e']);
    const none = project('none', []);
    const input = [low, high, none];

    const sorted = sortProjectsByTrust(input);

    expect(sorted.map((p) => p.id)).toEqual(['high', 'low', 'none']);
    expect(input.map((p) => p.id)).toEqual(['low', 'high', 'none']);
  });
});
