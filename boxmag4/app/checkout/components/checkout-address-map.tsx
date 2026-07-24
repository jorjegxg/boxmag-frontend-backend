"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "../../i18n/language-context";

const MAP_DEBOUNCE_MS = 700;

export type MapAddressInput = {
  addressLine1: string;
  addressLine2?: string;
  postcode?: string;
  city: string;
  country: string;
};

function buildMapQuery(address: MapAddressInput | null): string | null {
  if (!address) return null;

  const addressLine1 = address.addressLine1?.trim() ?? "";
  if (!addressLine1) return null;

  const parts = [
    addressLine1,
    address.addressLine2,
    address.postcode,
    address.city,
    address.country,
  ]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part));

  return parts.join(", ");
}

function getGoogleMapsApiKey(): string {
  return process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";
}

function buildEmbedUrl(query: string, apiKey: string): string {
  if (apiKey) {
    return `https://www.google.com/maps/embed/v1/place?key=${encodeURIComponent(apiKey)}&q=${encodeURIComponent(query)}&zoom=15&maptype=roadmap`;
  }
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&hl=ro&z=15&output=embed`;
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
  const [status, setStatus] = useState<MapStatus>("empty");

  useEffect(() => {
    if (!query) {
      setDebouncedQuery(null);
      setStatus("empty");
      return;
    }

    // Only show loading on first map load; keep the previous iframe while typing.
    setStatus((prev) => (prev === "ready" ? prev : "loading"));

    const timer = window.setTimeout(() => {
      setDebouncedQuery(query);
      setStatus("ready");
    }, MAP_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [query]);

  const googleMapsLink =
    debouncedQuery != null
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(debouncedQuery)}`
      : null;

  if (status === "ready" && debouncedQuery) {
    const apiKey = getGoogleMapsApiKey();
    const embedUrl = buildEmbedUrl(debouncedQuery, apiKey);

    return (
      <div className="relative h-full min-h-[160px] w-full sm:min-h-[160px]">
        <iframe
          key={debouncedQuery}
          title={t("checkout.map")}
          src={embedUrl}
          className="h-full min-h-[160px] w-full border-0"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
        {googleMapsLink ? (
          <a
            href={googleMapsLink}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute bottom-2 right-2 rounded bg-white/90 px-2 py-1 text-xs font-semibold text-gray-700 shadow hover:bg-white"
          >
            {t("checkout.map.openExternal")}
          </a>
        ) : null}
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
