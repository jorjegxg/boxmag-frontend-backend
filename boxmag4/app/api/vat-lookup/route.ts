import { NextRequest, NextResponse } from "next/server";

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

type VatLookupResult =
  | { valid: false }
  | { valid: true; companyName: string | null; address: string | null };

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

async function lookupWithVies(
  countryCode: string,
  vatNumber: string,
): Promise<VatLookupResult | null> {
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

async function lookupWithAnaf(
  vatNumber: string,
): Promise<{ companyName: string } | null> {
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
    found?: Array<{ date_generale?: { denumire?: string } }>;
  };

  const companyName = payload.found?.[0]?.date_generale?.denumire?.trim();
  if (!companyName) return null;

  return { companyName };
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

    let companyName = viesResult.companyName;

    if (!companyName && parsed.countryCode === "RO") {
      const anafResult = await lookupWithAnaf(parsed.vatNumber);
      companyName = anafResult?.companyName ?? null;
    }

    if (!companyName) {
      return NextResponse.json(
        { ok: false, message: "Company name not found for this VAT number" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      companyName,
      address: viesResult.address,
    });
  } catch {
    return NextResponse.json(
      { ok: false, message: "VAT lookup failed" },
      { status: 500 },
    );
  }
}
