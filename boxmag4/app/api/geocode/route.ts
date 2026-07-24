import { NextRequest, NextResponse } from "next/server";

type GoogleGeocodeResponse = {
  status?: string;
  results?: Array<{
    geometry?: { location?: { lat?: number; lng?: number } };
  }>;
};

type NominatimResult = {
  lat?: string;
  lon?: string;
};

function getGoogleMapsApiKey(): string {
  return (
    process.env.GOOGLE_MAPS_API_KEY?.trim() ||
    process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ||
    ""
  );
}

async function geocodeWithGoogle(query: string, apiKey: string) {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    return null;
  }

  const payload = (await response.json()) as GoogleGeocodeResponse;
  if (payload.status !== "OK" || !payload.results?.[0]?.geometry?.location) {
    return null;
  }

  const { lat, lng } = payload.results[0].geometry.location;
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return null;
  }

  return { lat, lon: lng };
}

async function geocodeWithNominatim(query: string) {
  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
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
  const hit = results[0];
  if (!hit?.lat || !hit?.lon) return null;

  const lat = Number(hit.lat);
  const lon = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null;

  return { lat, lon };
}

export async function GET(request: NextRequest) {
  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (query.length < 3) {
    return NextResponse.json({ ok: false, message: "Query too short" }, { status: 400 });
  }

  try {
    const apiKey = getGoogleMapsApiKey();
    const coords = apiKey
      ? await geocodeWithGoogle(query, apiKey)
      : await geocodeWithNominatim(query);

    if (!coords) {
      return NextResponse.json({ ok: false, message: "Address not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true, lat: coords.lat, lon: coords.lon });
  } catch {
    return NextResponse.json({ ok: false, message: "Geocoding failed" }, { status: 500 });
  }
}
