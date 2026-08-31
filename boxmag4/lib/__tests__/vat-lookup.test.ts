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
});
