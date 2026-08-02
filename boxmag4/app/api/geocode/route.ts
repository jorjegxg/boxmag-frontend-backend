import { NextRequest, NextResponse } from "next/server";

type GoogleGeocodeResult = {
  types?: string[];
  geometry?: {
    location?: { lat?: number; lng?: number };
    location_type?: string;
  };
};

type GoogleGeocodeResponse = {
  status?: string;
  results?: GoogleGeocodeResult[];
  error_message?: string;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
  class?: string;
  type?: string;
  importance?: number;
  address?: {
    house_number?: string;
    road?: string;
  };
};

type Coords = { lat: number; lon: number; precision: "exact" | "approximate" };

const LOCATION_TYPE_SCORE: Record<string, number> = {
  ROOFTOP: 4,
  RANGE_INTERPOLATED: 3,
  GEOMETRIC_CENTER: 2,
  APPROXIMATE: 1,
};

const RESULT_TYPE_SCORE: Record<string, number> = {
  street_address: 50,
  premise: 45,
  subpremise: 40,
  route: 20,
  intersection: 15,
  neighborhood: 5,
  locality: 3,
  administrative_area_level_2: 2,
  administrative_area_level_1: 1,
};

function getGoogleMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

/** Prefer street-number-first variants for RO-style "Locality, nr. 60". */
function buildGeocodeQueries(query: string): string[] {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const queries: string[] = [trimmed];
  const nrMatch = trimmed.match(/\bnr\.?\s*(\d+[A-Za-z]?)\b/i);
  if (nrMatch) {
    const house = nrMatch[1];
    const withoutNr = trimmed
      .replace(/\bnr\.?\s*\d+[A-Za-z]?\b/gi, "")
      .replace(/\s*,\s*,/g, ",")
      .replace(/^,\s*|,\s*$/g, "")
      .replace(/\s+/g, " ")
      .trim();
    if (withoutNr) {
      queries.unshift(`${house}, ${withoutNr}, Romania`);
      queries.unshift(`nr. ${house}, ${withoutNr}, Romania`);
    }
  }

  return [...new Set(queries)];
}

function extractWantedHouseNumber(query: string): string | null {
  const nrMatch = query.match(/\bnr\.?\s*(\d+[A-Za-z]?)\b/i);
  if (nrMatch) return nrMatch[1].toLowerCase();
  const trailing = query.match(/(?:^|,\s*)(\d+[A-Za-z]?)\s*(?:,|$)/);
  return trailing ? trailing[1].toLowerCase() : null;
}

function scoreGoogleResult(result: GoogleGeocodeResult): number {
  const locationType = result.geometry?.location_type ?? "";
  const typeScore = (result.types ?? []).reduce(
    (best, type) => Math.max(best, RESULT_TYPE_SCORE[type] ?? 0),
    0,
  );
  return (LOCATION_TYPE_SCORE[locationType] ?? 0) * 100 + typeScore;
}

function isExactGoogleResult(result: GoogleGeocodeResult): boolean {
  const locationType = result.geometry?.location_type;
  const types = result.types ?? [];
  return (
    locationType === "ROOFTOP" ||
    locationType === "RANGE_INTERPOLATED" ||
    types.includes("street_address") ||
    types.includes("premise") ||
    types.includes("subpremise")
  );
}

function pickBestGoogleResult(results: GoogleGeocodeResult[]): GoogleGeocodeResult | null {
  if (!results.length) return null;
  return results.reduce((best, current) =>
    scoreGoogleResult(current) > scoreGoogleResult(best) ? current : best,
  );
}

async function geocodeWithGoogle(query: string, apiKey: string): Promise<Coords | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleGeocodeResponse;
  if (payload.status !== "OK" || !payload.results?.length) {
    return null;
  }

  const best = pickBestGoogleResult(payload.results);
  const { lat, lng } = best?.geometry?.location ?? {};
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return {
    lat,
    lon: lng,
    precision: best && isExactGoogleResult(best) ? "exact" : "approximate",
  };
}

function scoreNominatimResult(result: NominatimResult, wantedHouse: string | null): number {
  let score = result.importance ?? 0;
  const house = result.address?.house_number?.toLowerCase() ?? "";
  if (wantedHouse && house === wantedHouse) score += 100;
  else if (result.address?.house_number) score += 10;
  if (result.address?.road) score += 3;
  if (result.class === "building" || result.type === "house") score += 5;
  if (result.class === "place" && (result.type === "town" || result.type === "village")) {
    score -= 2;
  }
  if (result.class === "boundary" || result.type === "administrative") {
    score -= 5;
  }
  return score;
}

function isExactNominatimResult(result: NominatimResult, wantedHouse: string | null): boolean {
  const house = result.address?.house_number?.toLowerCase() ?? "";
  if (wantedHouse && house === wantedHouse) return true;
  return Boolean(
    result.address?.house_number &&
      (result.class === "building" || result.type === "house" || result.address?.road),
  );
}

async function geocodeWithNominatim(
  query: string,
  wantedHouse: string | null,
): Promise<Coords | null> {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "5");
  url.searchParams.set("addressdetails", "1");
  url.searchParams.set("q", query);

  const response = await fetch(url.toString(), {
    headers: {
      "User-Agent": "BoxmagCheckout/1.0 (https://boxmag.eu)",
      Accept: "application/json",
    },
    cache: "no-store",
  });

  if (!response.ok) return null;

  const results = (await response.json()) as NominatimResult[];
  if (!results.length) return null;

  const hit = results.reduce((best, current) =>
    scoreNominatimResult(current, wantedHouse) >
    scoreNominatimResult(best, wantedHouse)
      ? current
      : best,
  );

  if (!hit?.lat || !hit?.lon) return null;

  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return {
    lat,
    lon,
    precision: isExactNominatimResult(hit, wantedHouse) ? "exact" : "approximate",
  };
}

async function geocodeBest(query: string): Promise<Coords | null> {
  const variants = buildGeocodeQueries(query);
  const wantedHouse = extractWantedHouseNumber(query);
  const apiKey = getGoogleMapsApiKey();

  let bestApproximate: Coords | null = null;

  for (const variant of variants) {
    const googleHit = apiKey ? await geocodeWithGoogle(variant, apiKey) : null;
    if (googleHit?.precision === "exact") return googleHit;
    if (googleHit && !bestApproximate) bestApproximate = googleHit;

    const nominatimHit = await geocodeWithNominatim(variant, wantedHouse);
    if (nominatimHit?.precision === "exact") return nominatimHit;
    if (nominatimHit && !bestApproximate) bestApproximate = nominatimHit;
  }

  return bestApproximate;
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ ok: false, message: "Query too short" }, { status: 400 });
  }

  try {
    const coords = await geocodeBest(query);

    if (!coords) {
      return NextResponse.json({ ok: false, message: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      lat: coords.lat,
      lon: coords.lon,
      precision: coords.precision,
    });
  } catch {
    return NextResponse.json({ ok: false, message: "Geocoding failed" }, { status: 500 });
  }
}
