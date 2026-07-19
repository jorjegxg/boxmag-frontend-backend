import { describe, expect, it } from "vitest";
import {
  clampToMinOrderQty,
  filterShopPrices,
  isRemovedPriceTier,
  SHOP_PRICE_TIER_NAMES,
} from "../constants/price-tiers";
import { MIN_ORDER_QTY } from "../constants/order";

describe("isRemovedPriceTier", () => {
  it.each(["100", "<100", "under100", " 100 ", "UNDER100"])(
    "treats %s as a removed tier",
    (name) => {
      expect(isRemovedPriceTier(name)).toBe(true);
    },
  );

  it.each(["300", "500", "Pallet"])("does not treat %s as removed", (name) => {
    expect(isRemovedPriceTier(name)).toBe(false);
  });
});

describe("filterShopPrices", () => {
  it("drops removed tiers and orders by SHOP_PRICE_TIER_NAMES", () => {
    const prices = [
      { name: "Pallet", value: 3 },
      { name: "100", value: 0 },
      { name: "500", value: 2 },
      { name: "300", value: 1 },
    ];

    expect(filterShopPrices(prices)).toEqual([
      { name: "300", value: 1 },
      { name: "500", value: 2 },
      { name: "Pallet", value: 3 },
    ]);
  });

  it("omits tiers that are entirely absent from the input", () => {
    const prices = [{ name: "300", value: 1 }];
    expect(filterShopPrices(prices)).toEqual([{ name: "300", value: 1 }]);
  });

  it("keeps only the first occurrence of a duplicated tier name", () => {
    const prices = [
      { name: "300", value: 1 },
      { name: "300", value: 999 },
    ];
    expect(filterShopPrices(prices)).toEqual([{ name: "300", value: 1 }]);
  });

  it("trims whitespace from tier names before matching", () => {
    const prices = [{ name: " 300 ", value: 1 }];
    expect(filterShopPrices(prices)[0]?.name).toBe("300");
  });

  it("returns an empty array when nothing matches known tiers", () => {
    expect(filterShopPrices([{ name: "100" }])).toEqual([]);
    expect(SHOP_PRICE_TIER_NAMES).toEqual(["300", "500", "Pallet"]);
  });
});

describe("clampToMinOrderQty", () => {
  it("returns MIN_ORDER_QTY when below the minimum", () => {
    expect(clampToMinOrderQty(1)).toBe(MIN_ORDER_QTY);
  });

  it("rounds and passes through values at or above the minimum", () => {
    expect(clampToMinOrderQty(MIN_ORDER_QTY + 50.4)).toBe(MIN_ORDER_QTY + 50);
  });

  it("rounds fractional values above the minimum", () => {
    expect(clampToMinOrderQty(150.6)).toBe(151);
  });
});
