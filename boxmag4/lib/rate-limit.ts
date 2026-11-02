/**
 * Simple in-memory rate limiter for Next.js route handlers (admin login,
 * contact form, geocode / VAT proxies).
 * Resets on process restart — enough to slow abuse on a single instance.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 20;
/** Sweep expired buckets once the map grows past this, so it cannot grow unbounded. */
const PRUNE_THRESHOLD = 5000;

function pruneExpired(now: number): void {
  if (buckets.size < PRUNE_THRESHOLD) return;
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/**
 * Client IP as seen by our reverse proxy.
 *
 * nginx sets `X-Real-IP` to the TCP peer address (overwriting anything the
 * client sent) and *appends* that same address to `X-Forwarded-For`. The first
 * X-Forwarded-For entry is therefore attacker-controlled and must never be
 * used as a rate-limit key — only X-Real-IP or the last forwarded entry.
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

/** Test helper: forget all counters. */
export function resetRateLimits(): void {
  buckets.clear();
}

export function consumeRateLimit(
  key: string,
  options?: { windowMs?: number; max?: number },
): { allowed: boolean; retryAfterSec: number } {
  const windowMs = options?.windowMs ?? WINDOW_MS;
  const max = options?.max ?? MAX_ATTEMPTS;
  const now = Date.now();
  pruneExpired(now);
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

/**
 * Per-client limit for a public route handler. Returns a ready 429 response
 * when the client is over budget, otherwise null.
 */
export function enforceRateLimit(
  request: Request,
  scope: string,
  options: { windowMs?: number; max: number },
): Response | null {
  const rate = consumeRateLimit(`${scope}:${getClientIp(request)}`, options);
  if (rate.allowed) return null;
  return Response.json(
    { ok: false, message: "Too many requests. Try again later." },
    { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
  );
}

/** Forget a key's attempts, e.g. after a successful login. */
export function clearRateLimit(key: string): void {
  buckets.delete(key);
}
