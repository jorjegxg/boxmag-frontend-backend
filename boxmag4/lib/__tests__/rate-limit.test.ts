import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";
import { consumeRateLimit, getClientIp } from "../rate-limit";

function requestWithHeaders(headers: Record<string, string>): Request {
  return new Request("http://localhost/api/admin/auth", { headers });
}

describe("getClientIp", () => {
  it("prefers X-Real-IP set by nginx", () => {
    expect(
      getClientIp(
        requestWithHeaders({
          "x-real-ip": "203.0.113.9",
          "x-forwarded-for": "1.2.3.4, 203.0.113.9",
        }),
      ),
    ).toBe("203.0.113.9");
  });

  it("ignores the client-controlled first X-Forwarded-For entry", () => {
    // nginx $proxy_add_x_forwarded_for appends the real peer as the last entry.
    expect(
      getClientIp(requestWithHeaders({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" })),
    ).toBe("203.0.113.9");
  });

  it("falls back to unknown without proxy headers", () => {
    expect(getClientIp(requestWithHeaders({}))).toBe("unknown");
  });
});

describe("consumeRateLimit", () => {
  it("blocks after max attempts within the window", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 3; i += 1) {
      expect(consumeRateLimit(key, { max: 3 }).allowed).toBe(true);
    }
    const blocked = consumeRateLimit(key, { max: 3 });
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterSec).toBeGreaterThan(0);
  });

  it("spoofed X-Forwarded-For prefixes share the real client's bucket", () => {
    const keys = ["1.1.1.1", "2.2.2.2", "3.3.3.3"].map(
      (spoofed) =>
        `admin-auth:${getClientIp(
          requestWithHeaders({ "x-forwarded-for": `${spoofed}, 198.51.100.7` }),
        )}`,
    );
    expect(new Set(keys).size).toBe(1);
  });
});

describe("public lookup routes (INV-RATE-LIMIT)", () => {
  it("throttles /api/vat-lookup per client IP", async () => {
    vi.resetModules();
    const { GET } = await import("../../app/api/vat-lookup/route");
    const call = (ip: string) =>
      GET(
        new NextRequest("http://localhost/api/vat-lookup?vat=NOT-A-VAT", {
          headers: { "x-real-ip": ip },
        }),
      );
    for (let i = 0; i < 120; i += 1) {
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
    for (let i = 0; i < 60; i += 1) {
      expect((await call()).status).toBe(400);
    }
    expect((await call()).status).toBe(429);
  });
});
