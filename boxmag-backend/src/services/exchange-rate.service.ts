const BNR_XML_URL = "https://www.bnr.ro/nbrfxrates.xml";
const FRANKFURTER_URL =
  "https://api.frankfurter.app/latest?from=EUR&to=RON";

const CACHE_TTL_MS = 60 * 60 * 1000;

export type ExchangeRateSource = "bnr" | "frankfurter";

export type EurRonRate = {
  rate: number;
  source: ExchangeRateSource;
  fetchedAt: string;
};

type CachedRate = EurRonRate & { expiresAt: number };

let cachedRate: CachedRate | null = null;

export function roundMoney(amount: number): number {
  return +amount.toFixed(2);
}

export function convertEurToRon(amountEur: number, rate: number): number {
  return roundMoney(amountEur * rate);
}

export function parseBnrEurRate(xml: string): number | null {
  const match = xml.match(
    /<Rate\s+currency="EUR"[^>]*>([\d.]+)<\/Rate>/i,
  );
  if (!match?.[1]) return null;
  const rate = Number(match[1]);
  return Number.isFinite(rate) && rate > 0 ? rate : null;
}

async function fetchBnrEurRonRate(): Promise<number | null> {
  const response = await fetch(BNR_XML_URL, {
    headers: { Accept: "application/xml,text/xml" },
  });
  if (!response.ok) return null;
  const xml = await response.text();
  return parseBnrEurRate(xml);
}

async function fetchFrankfurterEurRonRate(): Promise<number | null> {
  const response = await fetch(FRANKFURTER_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) return null;
  const payload = (await response.json()) as {
    rates?: { RON?: number };
  };
  const rate = payload.rates?.RON;
  return typeof rate === "number" && Number.isFinite(rate) && rate > 0
    ? rate
    : null;
}

export async function getEurRonRate(options?: {
  forceRefresh?: boolean;
}): Promise<EurRonRate> {
  const now = Date.now();
  if (
    !options?.forceRefresh &&
    cachedRate &&
    cachedRate.expiresAt > now
  ) {
    return {
      rate: cachedRate.rate,
      source: cachedRate.source,
      fetchedAt: cachedRate.fetchedAt,
    };
  }

  const fetchedAt = new Date().toISOString();
  const bnrRate = await fetchBnrEurRonRate();
  if (bnrRate != null) {
    cachedRate = {
      rate: bnrRate,
      source: "bnr",
      fetchedAt,
      expiresAt: now + CACHE_TTL_MS,
    };
    return {
      rate: bnrRate,
      source: "bnr",
      fetchedAt,
    };
  }

  const frankfurterRate = await fetchFrankfurterEurRonRate();
  if (frankfurterRate != null) {
    cachedRate = {
      rate: frankfurterRate,
      source: "frankfurter",
      fetchedAt,
      expiresAt: now + CACHE_TTL_MS,
    };
    return {
      rate: frankfurterRate,
      source: "frankfurter",
      fetchedAt,
    };
  }

  if (cachedRate) {
    return {
      rate: cachedRate.rate,
      source: cachedRate.source,
      fetchedAt: cachedRate.fetchedAt,
    };
  }

  throw new Error("Failed to fetch EUR/RON exchange rate");
}

export function clearEurRonRateCacheForTests(): void {
  cachedRate = null;
}
