"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  convertEurAmount,
  formatMoneyAmount,
  formatPriceFromEur,
  type DisplayCurrency,
} from "../../lib/format-price";
import { getBackendBaseUrl } from "../../lib/backend-url";

type ExchangeRateData = {
  rate: number;
  source: string;
  fetchedAt: string;
};

type CurrencyContextType = {
  currency: DisplayCurrency;
  setCurrency: (currency: DisplayCurrency) => void;
  exchangeRate: number | null;
  isRateLoading: boolean;
  rateFetchedAt: string | null;
  convert: (amountEur: number) => number;
  formatPrice: (amountEur: number) => string;
  formatAmount: (amount: number) => string;
  currencySymbol: string;
};

const CurrencyContext = createContext<CurrencyContextType | null>(null);

const STORAGE_KEY = "boxmag.currency";
const RATE_REFRESH_MS = 60 * 60 * 1000;

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<DisplayCurrency>("eur");
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [rateFetchedAt, setRateFetchedAt] = useState<string | null>(null);
  const [isRateLoading, setIsRateLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "eur" || saved === "ron") {
      setCurrencyState(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currency);
  }, [currency]);

  const loadExchangeRate = useCallback(async () => {
    setIsRateLoading(true);
    try {
      const response = await fetch(
        `${getBackendBaseUrl()}/api/exchange-rate/eur-ron`,
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: ExchangeRateData;
      };
      if (!response.ok || payload.ok !== true || !payload.data?.rate) {
        throw new Error("Failed to load exchange rate");
      }
      setExchangeRate(payload.data.rate);
      setRateFetchedAt(payload.data.fetchedAt);
    } catch (_error) {
      setExchangeRate(null);
    } finally {
      setIsRateLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadExchangeRate();
    const intervalId = window.setInterval(() => {
      void loadExchangeRate();
    }, RATE_REFRESH_MS);
    return () => window.clearInterval(intervalId);
  }, [loadExchangeRate]);

  const setCurrency = useCallback((next: DisplayCurrency) => {
    setCurrencyState(next);
  }, []);

  const value = useMemo<CurrencyContextType>(() => {
    const convert = (amountEur: number) =>
      convertEurAmount(amountEur, currency, exchangeRate);

    return {
      currency,
      setCurrency,
      exchangeRate,
      isRateLoading,
      rateFetchedAt,
      convert,
      formatPrice: (amountEur: number) =>
        formatPriceFromEur(amountEur, currency, exchangeRate),
      formatAmount: (amount: number) => formatMoneyAmount(amount, currency),
      currencySymbol: currency === "ron" ? "lei" : "€",
    };
  }, [
    currency,
    exchangeRate,
    isRateLoading,
    rateFetchedAt,
    setCurrency,
  ]);

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error("useCurrency must be used within CurrencyProvider");
  }
  return context;
}
