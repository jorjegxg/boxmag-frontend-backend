import { MIN_ORDER_QTY } from "./order";

export const SHOP_PRICE_TIER_NAMES = ["300", "500", "Pallet"] as const;

export function isRemovedPriceTier(name: string): boolean {
  const compact = name.trim().toLowerCase().replace(/\s/g, "");
  return compact === "100" || compact === "<100" || compact === "under100";
}

export function filterShopPrices<T extends { name: string }>(prices: T[]): T[] {
  const byName = new Map<string, T>();

  for (const price of prices) {
    if (isRemovedPriceTier(price.name)) {
      continue;
    }
    const key = price.name.trim();
    if (!byName.has(key)) {
      byName.set(key, { ...price, name: key } as T);
    }
  }

  return SHOP_PRICE_TIER_NAMES.map((name) => byName.get(name)).filter(
    (tier): tier is T => tier != null,
  );
}

export function clampToMinOrderQty(qty: number): number {
  return Math.max(MIN_ORDER_QTY, Math.round(qty));
}
