"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/language-context";

const MAP_DEBOUNCE_MS = 700;
const STREET_ZOOM = 17;
/** Half-span (degrees) for OSM embed bbox ≈ street-level. */
const OSM_BBOX_DELTA = 0.006;

export type MapAddressInput = {
  addressLine1: string;
  addressLine2?: string;
  postcode?: string;
  city: string;
  country: string;
};

type MapCoords = { lat: number; lon: number; precision: "exact" | "approximate" };

function buildMapQuery(address: MapAddressInput | null): string | null {
  if (!address) return null;

  const addressLine1 = address.addressLine1?.trim() ?? "";
  if (!addressLine1) return null;

  const parts = [
    addressLine1,
    address.addressLine2,
    address.postcode,
    address.city,
    address.country || "Romania",
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.join(", ");
}

function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

/** OSM embed pins exact lat/lng — no Google POI rename (e.g. Primăria). */
function buildOsmEmbedUrl(coords: MapCoords): string {
  const { lat, lon } = coords;
  const delta = coords.precision === "exact" ? OSM_BBOX_DELTA : OSM_BBOX_DELTA * 1.6;
  const bbox = [lon - delta, lat - delta * 0.65, lon + delta, lat + delta * 0.65].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${lat},${lon}`)}`;
}

function buildGoogleEmbedUrl(coords: MapCoords | null, query: string, apiKey: string): string {
  const pin = coords ? `${coords.lat},${coords.lon}` : query;
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(pin)}&zoom=${STREET_ZOOM}&maptype=roadmap`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(pin)}&hl=ro&z=${STREET_ZOOM}&output=embed`;
}

function buildEmbedUrl(coords: MapCoords | null, query: string, apiKey: string): string {
  // Prefer OSM marker when we have coordinates so the pin stays on the geocoded
  // point instead of snapping to a nearby named POI (city hall, shop, etc.).
  if (coords) {
    return buildOsmEmbedUrl(coords);
  }
  return buildGoogleEmbedUrl(null, query, apiKey);
}

function buildExternalMapsLink(coords: MapCoords | null, query: string): string {
  if (coords) {
    return `https://www.google.com/maps/search/?api=1&query=${coords.lat}%2C${coords.lon}`;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

type MapStatus = "empty" | "loading" | "ready";

export function CheckoutAddressMap({ address }: { address: MapAddressInput | null }) {
  const { t } = useLanguage();
  const query = useMemo(
    () => buildMapQuery(address),
    [
      address?.addressLine1,
      address?.addressLine2,
      address?.postcode,
      address?.city,
      address?.country,
    ],
  );
  const [debouncedQuery, setDebouncedQuery] = useState<string | null>(null);
  const [coords, setCoords] = useState<MapCoords | null>(null);
  const [status, setStatus] = useState<MapStatus>("empty");

  useEffect(() => {
    if (!query) {
      setDebouncedQuery(null);
      setCoords(null);
      setStatus("empty");
      return;
    }

    // Only show loading on first map load; keep the previous iframe while typing.
    setStatus((prev) => (prev === "ready" ? prev : "loading"));

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setDebouncedQuery(query);

      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(query)}`, {
          signal: controller.signal,
          cache: "no-store",
        });
        if (response.ok) {
          const payload = (await response.json()) as {
            ok?: boolean;
            lat?: number;
            lon?: number;
            precision?: "exact" | "approximate";
          };
          if (
            payload.ok === true &&
            typeof payload.lat === "number" &&
            typeof payload.lon === "number" &&
            Number.isFinite(payload.lat) &&
            Number.isFinite(payload.lon)
          ) {
            setCoords({
              lat: payload.lat,
              lon: payload.lon,
              precision: payload.precision === "exact" ? "exact" : "approximate",
            });
            setStatus("ready");
            return;
          }
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      }

      // Text query fallback if geocode fails — still show a map.
      setCoords(null);
      setStatus("ready");
    }, MAP_DEBOUNCE_MS);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  if (status === "ready" && debouncedQuery) {
    const apiKey = getGoogleMapsApiKey();
    const embedUrl = buildEmbedUrl(coords, debouncedQuery, apiKey);
    const googleMapsLink = buildExternalMapsLink(coords, debouncedQuery);

    return (
      <div className="relative h-full min-h-[160px] w-full sm:min-h-[160px]">
        <iframe
          key={`${debouncedQuery}:${coords?.lat ?? "q"}:${coords?.lon ?? ""}`}
          title={t("checkout.map")}
          src={embedUrl}
          className="h-full min-h-[160px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        <a
          href={googleMapsLink}
          target="_blank"
          rel="noopener noreferrer"
          className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-gray-700 shadow hover:bg-white"
        >
          {t("checkout.map.openExternal")}
        </a>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-[160px] w-full flex-col items-center justify-center gap-2 bg-gray-100 px-3 text-center text-sm text-gray-500 sm:min-h-[160px]">
      {status === "loading" ? (
        <p>{t("checkout.map.loading")}</p>
      ) : (
        <p>{t("checkout.map.fillAddress")}</p>
      )}
    </div>
  );
}
