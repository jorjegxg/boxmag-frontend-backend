import type { VatLookupAddressFields } from "./parse-vat-address";

export type VatLookupPayload = {
  ok?: boolean;
  companyName?: string;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  phone?: string | null;
  message?: string;
};

const VAT_COMPANY_CACHE_KEY = "boxmag.vatCompanyCache.v1";

export function normalizeVatNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

function readCache(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(VAT_COMPANY_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
  } catch {
    /* ignore malformed cache */
  }
  return {};
}

/**
 * Remember the company name resolved for a VAT number so other pages
 * (contact, checkout, business) can reuse it without calling /api/vat-lookup.
 * Only written after a successful /api/vat-lookup or saving on Account post-lookup.
 */
export function rememberVatCompany(
  vatNumber: string,
  companyName: string,
): void {
  if (typeof window === "undefined") return;
  const vat = normalizeVatNumber(vatNumber);
  const company = companyName.trim();
  if (!vat || !company) return;
  try {
    const cache = readCache();
    if (cache[vat] === company) return;
    cache[vat] = company;
    window.localStorage.setItem(VAT_COMPANY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable */
  }
}

/** Returns the cached company name for a VAT number, if previously resolved. */
export function getCachedVatCompany(vatNumber: string): string | null {
  const vat = normalizeVatNumber(vatNumber);
  if (!vat) return null;
  const cached = readCache()[vat];
  return cached && cached.trim() ? cached : null;
}

/** Remove one VAT entry from the browser cache (e.g. after a bad seed). */
export function forgetCachedVatCompany(vatNumber: string): void {
  if (typeof window === "undefined") return;
  const vat = normalizeVatNumber(vatNumber);
  if (!vat) return;
  try {
    const cache = readCache();
    if (!(vat in cache)) return;
    delete cache[vat];
    window.localStorage.setItem(VAT_COMPANY_CACHE_KEY, JSON.stringify(cache));
  } catch {
    /* storage unavailable */
  }
}

/** Clear all cached VAT → company pairs. */
export function clearVatCompanyCache(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(VAT_COMPANY_CACHE_KEY);
  } catch {
    /* storage unavailable */
  }
}

/**
 * Fetch company data for a VAT number from the lookup API.
 * On success the company name is cached for later reuse.
 */
export async function fetchVatLookup(
  vatNumber: string,
  signal?: AbortSignal,
): Promise<VatLookupPayload> {
  const vat = normalizeVatNumber(vatNumber);
  const response = await fetch(
    `/api/vat-lookup?vat=${encodeURIComponent(vat)}`,
    { signal },
  );
  const payload = (await response.json()) as VatLookupPayload;
  payload.ok = response.ok && payload.ok === true && !!payload.companyName;
  if (payload.ok && payload.companyName) {
    rememberVatCompany(vat, payload.companyName);
  }
  return payload;
}

export function vatPayloadToAddressFields(
  payload: VatLookupPayload,
): VatLookupAddressFields {
  return {
    companyName: payload.companyName,
    addressLine1: payload.addressLine1,
    addressLine2: payload.addressLine2,
    city: payload.city,
    postcode: payload.postcode,
    country: payload.country,
    phone: payload.phone,
  };
}
