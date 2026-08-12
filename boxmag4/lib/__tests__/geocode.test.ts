import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("GET /api/geocode", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
    delete process.env.GOOGLE_MAPS_API_KEY;
    delete process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  async function getGeocode(q: string) {
    const { GET } = await import("../../app/api/geocode/route");
    const request = new NextRequest(
      `http://localhost/api/geocode?q=${encodeURIComponent(q)}`,
    );
    return GET(request);
  }

  it("rejects query shorter than 3 characters", async () => {
    const response = await getGeocode("ab");
    expect(response.status).toBe(400);
    const payload = (await response.json()) as { message?: string };
    expect(payload.message).toContain("Query too short");
  });

  it("returns coords from Nominatim when Google key is missing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json(
          [
            {
              lat: "47.84",
              lon: "25.92",
              class: "place",
              type: "house",
              importance: 0.5,
              address: { house_number: "10", road: "Str Test" },
            },
          ],
          { status: 200 },
        ),
      ),
    );

    const response = await getGeocode("Str Test nr. 10, Radauti");
    expect(response.status).toBe(200);
    const payload = (await response.json()) as {
      ok?: boolean;
      lat?: number;
      lon?: number;
    };
    expect(payload.ok).toBe(true);
    expect(payload.lat).toBeCloseTo(47.84);
    expect(payload.lon).toBeCloseTo(25.92);
  });

  it("returns 404 when no provider finds coords", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => Response.json([], { status: 200 })),
    );

    const response = await getGeocode("Nowhere Place XYZ");
    expect(response.status).toBe(404);
  });
});
