// Simple in-memory sliding-window rate limiter for gated write endpoints.
// Deliberately lightweight (no captcha/email verification per design) — the
// goal is to deter spam, not to be bulletproof against a determined attacker.
// Good enough for a single long-lived Railway process; keyed by wallet
// address so it can't be trivially bypassed by rotating IPs.

interface Bucket {
  timestamps: number[];
}

const buckets = new Map<string, Bucket>();

export interface RateLimitConfig {
  windowMs: number;
  max: number;
}

export const RATE_LIMITS = {
  post: { windowMs: 60_000, max: 10 },
  like: { windowMs: 60_000, max: 60 },
  upload: { windowMs: 60_000, max: 10 },
  wallEvent: { windowMs: 60_000, max: 10 },
  project: { windowMs: 60_000, max: 5 },
  vouch: { windowMs: 60_000, max: 20 },
  profile: { windowMs: 60_000, max: 10 },
} satisfies Record<string, RateLimitConfig>;

export function checkRateLimit(
  key: string,
  action: keyof typeof RATE_LIMITS
): { allowed: boolean; retryAfterMs: number } {
  const config = RATE_LIMITS[action];
  const bucketKey = `${action}:${key}`;
  const now = Date.now();
  const bucket = buckets.get(bucketKey) ?? { timestamps: [] };
  bucket.timestamps = bucket.timestamps.filter((t) => now - t < config.windowMs);

  if (bucket.timestamps.length >= config.max) {
    const oldest = bucket.timestamps[0];
    buckets.set(bucketKey, bucket);
    return { allowed: false, retryAfterMs: config.windowMs - (now - oldest) };
  }

  bucket.timestamps.push(now);
  buckets.set(bucketKey, bucket);
  return { allowed: true, retryAfterMs: 0 };
}

export function clearRateLimits(): void {
  buckets.clear();
}
