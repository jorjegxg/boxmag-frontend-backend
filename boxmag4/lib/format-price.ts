export type DisplayCurrency = "eur" | "ron";

export function roundMoney(amount: number): number {
  return +amount.toFixed(2);
}

export function convertEurAmount(
  amountEur: number,
  currency: DisplayCurrency,
  exchangeRate: number | null,
): number {
  if (currency === "ron" && exchangeRate != null && exchangeRate > 0) {
    return roundMoney(amountEur * exchangeRate);
  }
  return roundMoney(amountEur);
}

export function getCurrencySymbol(currency: DisplayCurrency): string {
  return currency === "ron" ? "lei" : "€";
}

export function formatMoneyAmount(
  amount: number,
  currency: DisplayCurrency,
): string {
  const formatted = amount.toFixed(2);
  return currency === "ron" ? `${formatted} lei` : `€ ${formatted}`;
}

export function formatPriceFromEur(
  amountEur: number,
  currency: DisplayCurrency,
  exchangeRate: number | null,
): string {
  return formatMoneyAmount(
    convertEurAmount(amountEur, currency, exchangeRate),
    currency,
  );
}
