import { NextRequest, NextResponse } from "next/server";
import { parseViesAddress, type VatLookupAddressFields } from "@/lib/parse-vat-address";

const VIES_API_URL =
  "https://ec.europa.eu/taxation_customs/vies/rest-api/check-vat-number";
const ANAF_API_URL =
  "https://webservicesp.anaf.ro/api/PlatitorTvaRest/v9/tva";

const EU_COUNTRY_CODES = new Set([
  "RO",
  "DE",
  "FR",
  "IT",
  "ES",
  "NL",
  "BE",
  "PL",
  "AT",
  "HU",
]);

type ViesResponse = {
  isValid?: boolean;
  valid?: boolean;
  name?: string;
  address?: string;
};

type ViesLookupResult =
  | { valid: false }
  | { valid: true; companyName: string | null; address: string | null };

type AnafStructuredAddress = {
  street?: string;
  streetNumber?: string;
  city?: string;
  postcode?: string;
  country?: string;
};

type AnafLookupResult = {
  companyName: string;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  postcode: string | null;
  country: string | null;
  phone: string | null;
};

function parseVatNumber(
  raw: string,
): { countryCode: string; vatNumber: string } | null {
  const normalized = raw.trim().toUpperCase().replace(/\s+/g, "");
  const match = normalized.match(/^([A-Z]{2})([A-Z0-9]{2,12})$/);
  if (!match) return null;
  return { countryCode: match[1], vatNumber: match[2] };
}

function normalizeCompanyName(name: string | undefined): string | null {
  const trimmed = name?.trim().replace(/\s+/g, " ");
  if (!trimmed || trimmed === "---") return null;
  return trimmed;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function buildAddressLine1(street?: string, streetNumber?: string): string | null {
  const parts = [street?.trim(), streetNumber?.trim()].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : null;
}

function normalizeCountryCode(
  value: string | null | undefined,
  fallbackCode: string,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return fallbackCode;
  const upper = trimmed.toUpperCase();
  if (upper === "ROMANIA" || upper === "ROMÂNIA") return "RO";
  if (/^[A-Z]{2}$/.test(upper)) return upper;
  return trimmed;
}

function mergeLookupFields(
  primary: VatLookupAddressFields,
  fallback: VatLookupAddressFields,
): VatLookupAddressFields {
  return {
    companyName: primary.companyName ?? fallback.companyName ?? null,
    addressLine1: primary.addressLine1 ?? fallback.addressLine1 ?? null,
    addressLine2: primary.addressLine2 ?? fallback.addressLine2 ?? null,
    city: primary.city ?? fallback.city ?? null,
    postcode: primary.postcode ?? fallback.postcode ?? null,
    country: primary.country ?? fallback.country ?? null,
    phone: primary.phone ?? fallback.phone ?? null,
  };
}

async function lookupWithVies(
  countryCode: string,
  vatNumber: string,
): Promise<ViesLookupResult | null> {
  const response = await fetch(VIES_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ countryCode, vatNumber }),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as ViesResponse;
  const isValid = payload.isValid === true || payload.valid === true;
  if (!isValid) return { valid: false };

  return {
    valid: true,
    companyName: normalizeCompanyName(payload.name),
    address: payload.address?.trim() || null,
  };
}

function parseAnafStructuredAddress(
  source: Record<string, unknown> | undefined,
  prefix: "s" | "d",
): AnafStructuredAddress | null {
  if (!source) return null;

  const street = normalizeOptionalText(
    String(source[`${prefix}denumire_Strada`] ?? ""),
  );
  const streetNumber = normalizeOptionalText(
    String(source[`${prefix}numar_Strada`] ?? ""),
  );
  const city = normalizeOptionalText(
    String(source[`${prefix}denumire_Localitate`] ?? ""),
  );
  const postcode = normalizeOptionalText(
    String(source[`${prefix}cod_Postal`] ?? ""),
  );
  const country = normalizeOptionalText(String(source[`${prefix}tara`] ?? ""));

  if (!street && !city && !postcode) return null;

  return { street: street ?? undefined, streetNumber: streetNumber ?? undefined, city: city ?? undefined, postcode: postcode ?? undefined, country: country ?? undefined };
}

async function lookupWithAnaf(vatNumber: string): Promise<AnafLookupResult | null> {
  const cuiNumber = Number.parseInt(vatNumber.replace(/\D/g, ""), 10);
  if (!Number.isFinite(cuiNumber) || cuiNumber <= 0) return null;

  const today = new Date().toISOString().slice(0, 10);
  const response = await fetch(ANAF_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify([{ cui: cuiNumber, data: today }]),
    signal: AbortSignal.timeout(10000),
  });

  if (!response.ok) return null;

  const payload = (await response.json()) as {
    found?: Array<{
      date_generale?: {
        denumire?: string;
        adresa?: string;
        telefon?: string;
        codPostal?: string;
      };
      adresa_sediu_social?: Record<string, unknown>;
      adresa_domiciliu_fiscal?: Record<string, unknown>;
    }>;
  };

  const entry = payload.found?.[0];
  const general = entry?.date_generale;
  const companyName = general?.denumire?.trim();
  if (!companyName) return null;

  const structured =
    parseAnafStructuredAddress(entry?.adresa_sediu_social, "s") ??
    parseAnafStructuredAddress(entry?.adresa_domiciliu_fiscal, "d");

  const parsedGeneralAddress = parseViesAddress(general?.adresa, "RO");

  return {
    companyName,
    addressLine1:
      buildAddressLine1(structured?.street, structured?.streetNumber) ??
      parsedGeneralAddress.addressLine1 ??
      null,
    addressLine2: parsedGeneralAddress.addressLine2 ?? null,
    city: structured?.city ?? parsedGeneralAddress.city ?? null,
    postcode:
      structured?.postcode ??
      normalizeOptionalText(general?.codPostal) ??
      parsedGeneralAddress.postcode ??
      null,
    country: normalizeCountryCode(structured?.country, "RO"),
    phone: normalizeOptionalText(general?.telefon),
  };
}

export async function GET(request: NextRequest) {
  const vat = request.nextUrl.searchParams.get("vat")?.trim() ?? "";
  const parsed = parseVatNumber(vat);

  if (!parsed) {
    return NextResponse.json(
      { ok: false, message: "Invalid VAT format" },
      { status: 400 },
    );
  }

  if (!EU_COUNTRY_CODES.has(parsed.countryCode)) {
    return NextResponse.json(
      { ok: false, message: "VAT lookup is not supported for this country" },
      { status: 400 },
    );
  }

  try {
    const viesResult = await lookupWithVies(parsed.countryCode, parsed.vatNumber);
    if (!viesResult) {
      return NextResponse.json(
        { ok: false, message: "VAT lookup service unavailable" },
        { status: 502 },
      );
    }

    if (!viesResult.valid) {
      return NextResponse.json(
        { ok: false, message: "VAT number not found or invalid" },
        { status: 404 },
      );
    }

    const viesAddress = parseViesAddress(viesResult.address, parsed.countryCode);
    let lookup = mergeLookupFields(
      {
        companyName: viesResult.companyName,
        addressLine1: viesAddress.addressLine1,
        addressLine2: viesAddress.addressLine2,
        city: viesAddress.city,
        postcode: viesAddress.postcode,
        country: viesAddress.country
          ? normalizeCountryCode(viesAddress.country, parsed.countryCode)
          : parsed.countryCode,
      },
      {},
    );

    if (parsed.countryCode === "RO") {
      const anafResult = await lookupWithAnaf(parsed.vatNumber);
      if (anafResult) {
        lookup = mergeLookupFields(
          {
            companyName: anafResult.companyName,
            addressLine1: anafResult.addressLine1,
            addressLine2: anafResult.addressLine2,
            city: anafResult.city,
            postcode: anafResult.postcode,
            country: anafResult.country,
            phone: anafResult.phone,
          },
          lookup,
        );
      }
    }

    if (!lookup.companyName) {
      return NextResponse.json(
        { ok: false, message: "Company name not found for this VAT number" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      companyName: lookup.companyName,
      address: viesResult.address,
      addressLine1: lookup.addressLine1,
      addressLine2: lookup.addressLine2,
      city: lookup.city,
      postcode: lookup.postcode,
      country: lookup.country,
      phone: lookup.phone,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "VAT lookup failed" },
      { status: 500 },
    );
  }
}
