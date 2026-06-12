import type { PriceTier } from "../types/product";
import { MIN_ORDER_QTY } from "./order";

/** Canonical shop price tiers (orders from 100 pcs use the "300" tier). */
export const SHOP_PRICE_TIER_NAMES = ["300", "500", "Pallet"] as const;

export type ShopPriceTierName = (typeof SHOP_PRICE_TIER_NAMES)[number];

export function isRemovedPriceTier(name: string): boolean {
  const compact = name.trim().toLowerCase().replace(/\s/g, "");
  return compact === "100" || compact === "<100" || compact === "under100";
}

/** Drops removed tiers and returns tiers in display order. */
export function getShopPriceTiers(prices: PriceTier[]): PriceTier[] {
  const byName = new Map<string, PriceTier>();

  for (const price of prices) {
    if (isRemovedPriceTier(price.name)) {
      continue;
    }
    const key = price.name.trim();
    if (!byName.has(key)) {
      byName.set(key, { ...price, name: key });
    }
  }

  return SHOP_PRICE_TIER_NAMES.map((name) => byName.get(name)).filter(
    (tier): tier is PriceTier => tier != null,
  );
}

/** Unit price for the minimum e-commerce order quantity (100+ pcs → tier 300). */
export function getMinOrderUnitPrice(prices: PriceTier[]): number {
  const tiers = getShopPriceTiers(prices);
  const tier300 = tiers.find((tier) => tier.name === "300");
  return tier300?.withoutTax ?? tiers[0]?.withoutTax ?? 0;
}

export function clampToMinOrderQty(qty: number): number {
  return Math.max(MIN_ORDER_QTY, Math.round(qty));
}
