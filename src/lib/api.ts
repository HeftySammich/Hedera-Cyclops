import { NextResponse } from 'next/server';
import type { ZodError } from 'zod';
import type { GateResult } from './session';

// Small shared helpers so every route handler returns JSON errors in the
// same shape, instead of ad-hoc `{ error }` bodies scattered everywhere.

export function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export function zodError(error: ZodError) {
  const first = error.issues[0];
  return jsonError(first?.message ?? 'Invalid request', 400);
}

/** Turn a failed GateResult into a Response; caller should early-return when
 * `gate.ok` is false. */
export function gateError(gate: Extract<GateResult, { ok: false }>) {
  return jsonError(gate.error, gate.status);
}

export function rateLimitError(retryAfterMs: number) {
  const response = jsonError('Too many requests, please slow down.', 429);
  response.headers.set('Retry-After', String(Math.ceil(retryAfterMs / 1000)));
  return response;
}
