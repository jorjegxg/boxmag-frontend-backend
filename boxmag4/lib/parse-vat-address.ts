export type VatLookupAddressFields = {
  companyName?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  postcode?: string | null;
  country?: string | null;
  phone?: string | null;
};

export function parseViesAddress(
  rawAddress: string | null | undefined,
  countryCode: string,
): Omit<VatLookupAddressFields, "companyName" | "phone"> {
  const trimmed = rawAddress?.trim();
  if (!trimmed) {
    return { country: countryCode };
  }

  const lines = trimmed
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { country: countryCode };
  }

  if (lines.length === 1) {
    const singleLine = lines[0]!;
    const postcodeCityMatch = singleLine.match(/^(\d{4,6})\s+(.+)$/);
    if (postcodeCityMatch) {
      return {
        addressLine1: singleLine,
        postcode: postcodeCityMatch[1],
        city: postcodeCityMatch[2],
        country: countryCode,
      };
    }
    return {
      addressLine1: singleLine,
      country: countryCode,
    };
  }

  const lastLine = lines[lines.length - 1]!;
  const postcodeCityMatch = lastLine.match(/^(\d{4,6})\s+(.+)$/);

  let postcode: string | null = null;
  let city: string | null = null;
  let addressLines = lines;

  if (postcodeCityMatch) {
    postcode = postcodeCityMatch[1] ?? null;
    city = postcodeCityMatch[2] ?? null;
    addressLines = lines.slice(0, -1);
  } else {
    city = lastLine;
    addressLines = lines.slice(0, -1);
  }

  return {
    addressLine1: addressLines[0] ?? null,
    addressLine2:
      addressLines.length > 1 ? addressLines.slice(1).join(", ") : null,
    city,
    postcode,
    country: countryCode,
  };
}

export function mergeVatLookupFields<T extends Record<string, string>>(
  current: T,
  lookup: VatLookupAddressFields,
  fieldMap: {
    companyName?: keyof T;
    addressLine1?: keyof T;
    addressLine2?: keyof T;
    city?: keyof T;
    postcode?: keyof T;
    country?: keyof T;
    phone?: keyof T;
  },
): T {
  const next = { ...current };

  const assignIfEmpty = (
    field: keyof T | undefined,
    value: string | null | undefined,
  ) => {
    if (!field || value == null) return;
    const normalized = value.trim();
    if (!normalized) return;
    const existing = String(next[field] ?? "").trim();
    if (!existing) {
      next[field] = normalized as T[keyof T];
    }
  };

  assignIfEmpty(fieldMap.companyName, lookup.companyName);
  assignIfEmpty(fieldMap.addressLine1, lookup.addressLine1);
  assignIfEmpty(fieldMap.addressLine2, lookup.addressLine2);
  assignIfEmpty(fieldMap.city, lookup.city);
  assignIfEmpty(fieldMap.postcode, lookup.postcode);
  assignIfEmpty(fieldMap.country, lookup.country);
  assignIfEmpty(fieldMap.phone, lookup.phone);

  return next;
}
