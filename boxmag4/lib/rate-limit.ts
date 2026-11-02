/**
 * Simple in-memory rate limiter for Next.js route handlers (admin login, contact).
 * Resets on process restart — enough to slow brute force on a single instance.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
/** Sweep expired buckets once the map grows past this, so it cannot grow unbounded. */
const SWEEP_THRESHOLD = 5_000;

function sweepExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Client IP we can trust behind nginx. `X-Real-IP` is set by nginx to
 * `$remote_addr`; with `$proxy_add_x_forwarded_for` the client controls every
 * `X-Forwarded-For` entry except the last one (appended by nginx), so never use
 * the first entry.
 */
export function getClientIp(request: Request): string {
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const entries = forwarded
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);
    const last = entries[entries.length - 1];
    if (last) return last;
  }
  return "unknown";
}

export function consumeRateLimit(
  key: string,
  options?: { windowMs?: number; max?: number },
): { allowed: boolean; retryAfterSec: number } {
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const max = options?.max ?? MAX_ATTEMPTS;
  const now = Date.now();
  if (buckets.size > SWEEP_THRESHOLD) sweepExpiredBuckets(now);
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (existing.count >= max) {
    return {
      allowed: false,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    };
  }

  existing.count += 1;
  return { allowed: true, retryAfterSec: 0 };
}
