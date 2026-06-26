/** Matches top-bar “Shipping to” — highest priority in lists. */
export const SHIPPING_TO_COUNTRY_CODES = [
  "RO",
  "BG",
  "HU",
  "PL",
  "DE",
  "AT",
  "CZ",
  "GR",
] as const;

type CountryOption = { code: string; name: string };

/** Shipping destinations first, then nearby / free-delivery EU, then other popular EU. */
export const VAT_SUPPORTED_COUNTRIES: CountryOption[] = [
  // Shipping to
  { code: "RO", name: "Romania" },
  { code: "BG", name: "Bulgaria" },
  { code: "HU", name: "Hungary" },
  { code: "PL", name: "Poland" },
  { code: "DE", name: "Germany" },
  { code: "AT", name: "Austria" },
  { code: "CZ", name: "Czech Republic" },
  { code: "GR", name: "Greece" },
  // Near Romania + free-delivery zone
  { code: "SK", name: "Slovakia" },
  { code: "HR", name: "Croatia" },
  { code: "SI", name: "Slovenia" },
  { code: "FR", name: "France" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "BE", name: "Belgium" },
  // Other popular EU
  { code: "ES", name: "Spain" },
  { code: "PT", name: "Portugal" },
  { code: "IE", name: "Ireland" },
  { code: "LU", name: "Luxembourg" },
  { code: "LT", name: "Lithuania" },
  { code: "LV", name: "Latvia" },
  { code: "EE", name: "Estonia" },
  { code: "FI", name: "Finland" },
  { code: "SE", name: "Sweden" },
  { code: "DK", name: "Denmark" },
  { code: "CY", name: "Cyprus" },
  { code: "MT", name: "Malta" },
];

export const VAT_SUPPORTED_COUNTRY_CODES = VAT_SUPPORTED_COUNTRIES.map(
  (country) => country.code,
);

export const VAT_SUPPORTED_COUNTRY_SET = new Set(VAT_SUPPORTED_COUNTRY_CODES);

/** VIES uses EL for Greece; UI and ISO use GR. */
export function toViesCountryCode(countryCode: string): string {
  const upper = countryCode.trim().toUpperCase();
  if (upper === "GR") return "EL";
  return upper;
}

/** Accept GR or EL prefix in user input; normalize stored/display prefix to GR. */
export function normalizeVatCountryPrefix(countryCode: string): string {
  const upper = countryCode.trim().toUpperCase();
  if (upper === "EL") return "GR";
  return upper;
}

export function isVatLookupSupportedCountry(countryCode: string): boolean {
  const upper = countryCode.trim().toUpperCase();
  if (upper === "EL") return true;
  return VAT_SUPPORTED_COUNTRY_SET.has(upper);
}

export function normalizeContactCountry(value: string | undefined): string {
  const normalized = (value ?? "").trim().toUpperCase();
  if (normalized === "EL") return "GR";
  if (VAT_SUPPORTED_COUNTRY_SET.has(normalized)) return normalized;
  if (normalized) return "OTHER";
  return "";
}
