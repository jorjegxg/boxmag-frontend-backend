import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeRateLimit,
  enforceRateLimit,
  getClientIp,
  resetRateLimits,
} from "../rate-limit";

function requestWith(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/x", { headers });
}

describe("getClientIp", () => {
  it("prefers X-Real-IP set by the reverse proxy", () => {
    expect(
      getClientIp(
        requestWith({
          "x-real-ip": "198.51.100.7",
          "x-forwarded-for": "1.2.3.4, 198.51.100.7",
        }),
      ),
    ).toBe("198.51.100.7");
  });

  it("uses the LAST X-Forwarded-For entry, never the client-supplied first one", () => {
    expect(
      getClientIp(requestWith({ "x-forwarded-for": "6.6.6.6, 198.51.100.7" })),
    ).toBe("198.51.100.7");
  });

  it("falls back to a shared bucket without proxy headers", () => {
    expect(getClientIp(requestWith({}))).toBe("unknown");
  });
});

describe("enforceRateLimit", () => {
  beforeEach(() => resetRateLimits());

  it("cannot be bypassed by rotating a spoofed X-Forwarded-For prefix", () => {
    const results = Array.from({ length: 4 }, (_, attempt) =>
      enforceRateLimit(
        requestWith({
          "x-real-ip": "198.51.100.7",
          "x-forwarded-for": `10.0.0.${attempt}, 198.51.100.7`,
        }),
        "scope",
        { max: 3 },
      ),
    );

    expect(results.slice(0, 3)).toEqual([null, null, null]);
    expect(results[3]?.status).toBe(429);
    expect(results[3]?.headers.get("Retry-After")).toBeTruthy();
  });

  it("keeps scopes and clients independent", () => {
    const client = requestWith({ "x-real-ip": "198.51.100.8" });
    expect(enforceRateLimit(client, "a", { max: 1 })).toBeNull();
    expect(enforceRateLimit(client, "b", { max: 1 })).toBeNull();
    expect(
      enforceRateLimit(requestWith({ "x-real-ip": "198.51.100.9" }), "a", {
        max: 1,
      }),
    ).toBeNull();
    expect(enforceRateLimit(client, "a", { max: 1 })?.status).toBe(429);
  });

  it("opens a new window after expiry", () => {
    vi.useFakeTimers();
    try {
      expect(consumeRateLimit("k", { max: 1, windowMs: 1000 }).allowed).toBe(true);
      expect(consumeRateLimit("k", { max: 1, windowMs: 1000 }).allowed).toBe(false);
      vi.advanceTimersByTime(1001);
      expect(consumeRateLimit("k", { max: 1, windowMs: 1000 }).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("public lookup routes (INV-RATE-LIMITS)", () => {
  it("throttles /api/vat-lookup per client IP", async () => {
    vi.resetModules();
    const { GET } = await import("../../app/api/vat-lookup/route");
    const call = (ip: string) =>
      GET(
        new NextRequest("http://localhost/api/vat-lookup?vat=NOT-A-VAT", {
          headers: { "x-real-ip": ip },
        }),
      );
    for (let i = 0; i < 60; i += 1) {
      expect((await call("203.0.113.20")).status).toBe(400);
    }
    const blocked = await call("203.0.113.20");
    expect(blocked.status).toBe(429);
    expect(((await blocked.json()) as { code?: string }).code).toBe("lookup_failed");
    expect((await call("203.0.113.21")).status).toBe(400);
  });

  it("throttles /api/geocode per client IP", async () => {
    vi.resetModules();
    const { GET } = await import("../../app/api/geocode/route");
    const call = () =>
      GET(
        new NextRequest("http://localhost/api/geocode?q=ab", {
          headers: { "x-real-ip": "203.0.113.30" },
        }),
      );
    for (let i = 0; i < 120; i += 1) {
      expect((await call()).status).toBe(400);
    }
    expect((await call()).status).toBe(429);
  });
});
