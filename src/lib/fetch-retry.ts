export interface FetchRetryOptions {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  retryOn?: (response: Response) => boolean;
}

const RETRYABLE_STATUSES = new Set([429, 500, 502, 503, 504]);

function defaultRetryOn(response: Response): boolean {
  return RETRYABLE_STATUSES.has(response.status);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** fetch() wrapper that retries on transient errors/rate-limits with
 * exponential backoff and a small jitter. Throws the final response on
 * exhaustion so callers can decide whether to cache a failure. */
export async function fetchWithRetry(
  input: RequestInfo | URL,
  init?: RequestInit,
  opts: FetchRetryOptions = {}
): Promise<Response> {
  const maxAttempts = opts.maxAttempts ?? 4;
  const baseDelayMs = opts.baseDelayMs ?? 250;
  const maxDelayMs = opts.maxDelayMs ?? 8_000;
  const retryOn = opts.retryOn ?? defaultRetryOn;

  let lastResponse: Response | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const res = await fetch(input, init);
    lastResponse = res;

    if (res.ok || !retryOn(res)) {
      return res;
    }

    const isLast = attempt === maxAttempts;
    if (isLast) break;

    // Honor a Retry-After header when the server provides one (in seconds).
    const retryAfter = res.headers.get('retry-after');
    const retryAfterMs = retryAfter ? Number(retryAfter) * 1000 : undefined;
    const exponential = baseDelayMs * 2 ** (attempt - 1);
    const jitter = Math.random() * 250;
    const delay = Math.min(retryAfterMs ?? exponential + jitter, maxDelayMs);
    await sleep(delay);
  }

  // Clone so the caller can still read the body if needed.
  return lastResponse!;
}
