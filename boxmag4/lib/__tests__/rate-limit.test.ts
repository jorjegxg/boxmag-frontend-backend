import { describe, expect, it } from "vitest";
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
