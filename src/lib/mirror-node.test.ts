import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  accountHoldsCollection,
  clearMirrorNodeCaches,
  getAccountPublicKey,
  getNftsForAccountAndToken,
} from './mirror-node';

function jsonResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

describe('mirror-node', () => {
  beforeEach(() => {
    clearMirrorNodeCaches();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  describe('getAccountPublicKey', () => {
    it('returns the key when the account exists', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(
        jsonResponse({ key: { _type: 'ED25519', key: 'abc123' } })
      );
      const key = await getAccountPublicKey('0.0.1234');
      expect(key).toEqual({ _type: 'ED25519', key: 'abc123' });
    });

    it('returns null on a 404', async () => {
      vi.mocked(fetch).mockResolvedValueOnce(jsonResponse(null, 404));
      const key = await getAccountPublicKey('0.0.9999');
      expect(key).toBeNull();
    });
  });

  describe('getNftsForAccountAndToken', () => {
    it('follows pagination links until exhausted', async () => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(
          jsonResponse({
            nfts: [{ account_id: '0.0.1', token_id: '0.0.1', serial_number: 1, metadata: '' }],
            links: { next: '/api/v1/page2' },
          })
        )
        .mockResolvedValueOnce(
          jsonResponse({
            nfts: [{ account_id: '0.0.1', token_id: '0.0.1', serial_number: 2, metadata: '' }],
            links: { next: null },
          })
        );

      const nfts = await getNftsForAccountAndToken('0.0.1', '0.0.1');
      expect(nfts.map((n) => n.serial_number)).toEqual([1, 2]);
      expect(fetch).toHaveBeenCalledTimes(2);
    });

    it('caches results for the same token/account pair', async () => {
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({ nfts: [], links: { next: null } })
      );
      await getNftsForAccountAndToken('0.0.1', '0.0.1');
      await getNftsForAccountAndToken('0.0.1', '0.0.1');
      expect(fetch).toHaveBeenCalledTimes(1);
    });
  });

  describe('accountHoldsCollection', () => {
    it('returns false when no token ids are configured', async () => {
      vi.stubEnv('HEDERA_TOKEN_IDS', '');
      const holds = await accountHoldsCollection('0.0.1234');
      expect(holds).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('returns true when the account owns at least one NFT', async () => {
      vi.stubEnv('HEDERA_TOKEN_IDS', '0.0.5000');
      vi.mocked(fetch).mockResolvedValue(
        jsonResponse({
          nfts: [{ account_id: '0.0.1234', token_id: '0.0.5000', serial_number: 1, metadata: '' }],
          links: { next: null },
        })
      );
      expect(await accountHoldsCollection('0.0.1234')).toBe(true);
    });

    it('returns false when the account owns nothing', async () => {
      vi.stubEnv('HEDERA_TOKEN_IDS', '0.0.5000');
      vi.mocked(fetch).mockResolvedValue(jsonResponse({ nfts: [], links: { next: null } }));
      expect(await accountHoldsCollection('0.0.9999')).toBe(false);
    });
  });
});
