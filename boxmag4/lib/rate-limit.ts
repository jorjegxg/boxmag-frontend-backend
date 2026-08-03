/**
 * Simple in-memory rate limiter for Next.js route handlers (admin login).
 * Resets on process restart — enough to slow brute force on a single instance.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;

export function consumeRateLimit(
  key: string,
  options?: { windowMs?: number; max?: number },
): { allowed: boolean; retryAfterSec: number } {
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const max = options?.max ?? MAX_ATTEMPTS;
  const now = Date.now();
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
