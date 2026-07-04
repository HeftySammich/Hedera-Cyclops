import jwt from 'jsonwebtoken';
import { env } from './env';

export interface SessionPayload {
  sub: string; // User.id
  walletAddress: string;
}

const SESSION_TTL = '2h';

function secretOrThrow(): string {
  if (!env.authJwtSecret) {
    throw new Error(
      'AUTH_JWT_SECRET is not configured — set it via environment variables (never hardcode it).'
    );
  }
  return env.authJwtSecret;
}

/** Sign a short-lived session JWT. Never log the token or the secret. */
export function signSession(payload: SessionPayload): string {
  return jwt.sign(payload, secretOrThrow(), { expiresIn: SESSION_TTL });
}

/** Verify + decode a session JWT. Returns null on any failure (expired,
 * malformed, wrong signature) — callers must treat null as "not signed in". */
export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, secretOrThrow());
    if (typeof decoded === 'string') return null;
    if (typeof decoded.sub !== 'string' || typeof decoded.walletAddress !== 'string') {
      return null;
    }
    return { sub: decoded.sub, walletAddress: decoded.walletAddress };
  } catch {
    return null;
  }
}
