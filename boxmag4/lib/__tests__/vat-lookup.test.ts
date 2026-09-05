import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/vat-lookup", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function getVat(vat: string) {
    const { GET } = await import("../../app/api/vat-lookup/route");
    const request = new NextRequest(
      `http://localhost/api/vat-lookup?vat=${encodeURIComponent(vat)}`,
    );
    return GET(request);
  }

  it("rejects invalid VAT format", async () => {
    const response = await getVat("NOT-A-VAT");
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { message?: string };
    expect(payload.message).toContain("Invalid VAT format");
  });

  it("rejects empty VAT", async () => {
    const response = await getVat("");
    expect(response.status).toBe(400);
  });

  it("returns 404 when VIES says invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ isValid: false }, { status: 200 }),
      ),
    );
    const response = await getVat("RO12345678");
    expect(response.status).toBe(404);
    const payload = (await response.json()) as { message?: string };
    expect(payload.message).toContain("not found or invalid");
  });

  it("returns 200 with companyNameUnavailable when VIES valid but no name", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          { valid: true, name: "---", address: "---" },
          { status: 200 },
        ),
      ),
    );
    const response = await getVat("DE115235681");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok?: boolean;
      companyNameUnavailable?: boolean;
      companyName?: string | null;
      country?: string;
    };
    expect(payload.ok).toBe(true);
    expect(payload.companyNameUnavailable).toBe(true);
    expect(payload.companyName).toBeNull();
    expect(payload.country).toBe("DE");
  });

  it("falls back to ANAF when VIES is unavailable for RO", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("vies")) {
        return new Response("forbidden", { status: 403 });
      }
      if (href.includes("anaf")) {
        return Response.json({
          found: [
            {
              date_generale: {
                denumire: "DANTE INTERNATIONAL SA",
                adresa:
                  "MUNICIPIUL BUCUREŞTI, SECTOR 2, STR. GARA HERĂSTRĂU, NR.6",
                telefon: "0210000000",
                codPostal: "020334",
              },
            },
          ],
        });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await getVat("RO14399840");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok?: boolean;
      companyName?: string | null;
      country?: string | null;
      lookupUnavailable?: boolean;
    };
    expect(payload.ok).toBe(true);
    expect(payload.companyName).toBe("DANTE INTERNATIONAL SA");
    expect(payload.country).toBe("RO");
    expect(payload.lookupUnavailable).toBeUndefined();
    expect(fetchMock).toHaveBeenCalled();
  });

  it("soft-fails with lookupUnavailable when VIES is down for non-RO", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("unavailable", { status: 503 })),
    );
    const response = await getVat("DE115235681");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok?: boolean;
      companyNameUnavailable?: boolean;
      lookupUnavailable?: boolean;
      companyName?: string | null;
      country?: string;
    };
    expect(payload.ok).toBe(true);
    expect(payload.companyNameUnavailable).toBe(true);
    expect(payload.lookupUnavailable).toBe(true);
    expect(payload.companyName).toBeNull();
    expect(payload.country).toBe("DE");
  });

  it("does not call ANAF to override VIES invalid for RO", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("vies")) {
        return Response.json({ isValid: false }, { status: 200 });
      }
      throw new Error(`unexpected fetch: ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await getVat("RO12345678");
    expect(response.status).toBe(404);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("soft-fails when VIES is down and ANAF misses for RO", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href.includes("vies")) {
        return new Response("unavailable", { status: 502 });
      }
      if (href.includes("anaf")) {
        return Response.json({ found: [] });
      }
      return new Response("not found", { status: 404 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await getVat("RO99999999");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok?: boolean;
      lookupUnavailable?: boolean;
      companyNameUnavailable?: boolean;
    };
    expect(payload.ok).toBe(true);
    expect(payload.lookupUnavailable).toBe(true);
    expect(payload.companyNameUnavailable).toBe(true);
  });
});
