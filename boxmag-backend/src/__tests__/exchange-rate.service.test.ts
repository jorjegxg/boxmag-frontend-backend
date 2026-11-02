import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearEurRonRateCacheForTests,
  convertEurToRon,
  getEurRonRate,
  parseBnrEurRate,
  roundMoney,
} from "../services/exchange-rate.service";

describe("exchange-rate.service", () => {
  beforeEach(() => {
    clearEurRonRateCacheForTests();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    clearEurRonRateCacheForTests();
  });

  it("parses BNR EUR rate from XML", () => {
    const xml = `
      <Cube>
        <Rate currency="USD">4.3</Rate>
        <Rate currency="EUR">4.9756</Rate>
      </Cube>
    `;
    expect(parseBnrEurRate(xml)).toBe(4.9756);
  });

  it("converts EUR amounts to RON with two decimals", () => {
    expect(roundMoney(1.016)).toBe(1.02);
    expect(convertEurToRon(10, 4.9756)).toBe(49.76);
  });

  it("uses BNR rate when available", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("bnr.ro")) {
          return new Response(
            '<Rate currency="EUR">4.9000</Rate>',
            { status: 200 },
          );
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const rate = await getEurRonRate();
    expect(rate.rate).toBe(4.9);
    expect(rate.source).toBe("bnr");
  });

  it("falls back to Frankfurter when BNR fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("bnr.ro")) {
          return new Response("error", { status: 500 });
        }
        if (url.includes("frankfurter.app")) {
          return new Response(JSON.stringify({ rates: { RON: 4.95 } }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        throw new Error(`Unexpected fetch: ${url}`);
      }),
    );

    const rate = await getEurRonRate();
    expect(rate.rate).toBe(4.95);
    expect(rate.source).toBe("frankfurter");
  });

  it("falls back to Frankfurter when BNR throws a network error", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        if (url.includes("bnr.ro")) {
          throw new TypeError("fetch failed");
        }
        return new Response(JSON.stringify({ rates: { RON: 4.97 } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );

    const rate = await getEurRonRate();
    expect(rate.rate).toBe(4.97);
    expect(rate.source).toBe("frankfurter");
  });

  it("serves the stale cached rate when every source throws", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response('<Rate currency="EUR">4.9100</Rate>', { status: 200 })),
    );
    await getEurRonRate();

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );
    const rate = await getEurRonRate({ forceRefresh: true });
    expect(rate.rate).toBe(4.91);
    expect(rate.source).toBe("bnr");
  });

  it("throws when no source works and nothing is cached", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(getEurRonRate()).rejects.toThrow(
      "Failed to fetch EUR/RON exchange rate",
    );
  });
});
