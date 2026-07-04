import { describe, expect, it } from 'vitest';
import jwt from 'jsonwebtoken';
import { signSession, verifySession } from './jwt';

describe('signSession / verifySession', () => {
  it('round-trips a valid payload', () => {
    const token = signSession({ sub: 'user_1', walletAddress: '0.0.1234' });
    const decoded = verifySession(token);
    expect(decoded).toEqual({ sub: 'user_1', walletAddress: '0.0.1234' });
  });

  it('rejects a malformed token', () => {
    expect(verifySession('not-a-real-token')).toBeNull();
  });

  it('rejects a token signed with a different secret', () => {
    const forged = jwt.sign({ sub: 'user_1', walletAddress: '0.0.1234' }, 'wrong-secret');
    expect(verifySession(forged)).toBeNull();
  });

  it('rejects an expired token', () => {
    const expired = jwt.sign(
      { sub: 'user_1', walletAddress: '0.0.1234' },
      'test-secret-do-not-use-in-production',
      { expiresIn: -10 }
    );
    expect(verifySession(expired)).toBeNull();
  });

  it('rejects a token missing required fields', () => {
    const incomplete = jwt.sign({ sub: 'user_1' }, 'test-secret-do-not-use-in-production');
    expect(verifySession(incomplete)).toBeNull();
  });
});
