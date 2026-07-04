import { NextRequest, NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import { env } from './env';
import { verifySession, signSession } from './jwt';
import { prisma } from './prisma';
import { accountHoldsCollection } from './mirror-node';

const COOKIE_MAX_AGE_SECONDS = 2 * 60 * 60; // matches jwt.ts SESSION_TTL

export function setSessionCookie(response: NextResponse, userId: string, walletAddress: string) {
  const token = signSession({ sub: userId, walletAddress });
  response.cookies.set(env.authCookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE_SECONDS,
  });
  return response;
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set(env.authCookieName, '', { path: '/', maxAge: 0 });
  return response;
}

/** Decode the session cookie, if any, without hitting the database. */
export function getSessionPayload(request: NextRequest) {
  const token = request.cookies.get(env.authCookieName)?.value;
  if (!token) return null;
  return verifySession(token);
}

/** Load the authenticated User row for the current request, if any. */
export async function getSessionUser(request: NextRequest): Promise<User | null> {
  const payload = getSessionPayload(request);
  if (!payload) return null;
  return prisma.user.findUnique({ where: { id: payload.sub } });
}

export type GateResult =
  | { ok: true; user: User }
  | { ok: false; status: 401 | 403; error: string };

/**
 * Every gated write MUST call this. It requires a valid session AND
 * re-checks live NFT holdership via Mirror Node (never trusts a cached
 * flag) — a user who no longer holds is denied even with a valid session.
 */
export async function requireHolder(request: NextRequest): Promise<GateResult> {
  const user = await getSessionUser(request);
  if (!user) return { ok: false, status: 401, error: 'Sign in with your wallet first.' };
  const holds = await accountHoldsCollection(user.walletAddress);
  if (!holds) {
    return {
      ok: false,
      status: 403,
      error: 'This wallet no longer holds a Hedera Cyclops.',
    };
  }
  return { ok: true, user };
}

export async function requireAdmin(request: NextRequest): Promise<GateResult> {
  const user = await getSessionUser(request);
  if (!user) return { ok: false, status: 401, error: 'Sign in with your wallet first.' };
  if (!user.isAdmin) return { ok: false, status: 403, error: 'Admin access required.' };
  return { ok: true, user };
}
