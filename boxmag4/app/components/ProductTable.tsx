"use client";

import { FaCheck, FaMinus, FaPlus, FaShoppingCart } from "react-icons/fa";
import useTableEComStore from "../stores/table_e_commerce_store";
import { Product } from "../types/product";
import { useLanguage } from "../i18n/language-context";
import { useCurrency } from "../currency/currency-context";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCartStore } from "../stores/cart_store";
import { MIN_ORDER_QTY } from "../constants/order";
import {
  getMinOrderUnitPrice,
  getShopPriceTiers,
  SHOP_PRICE_TIER_NAMES,
} from "../constants/price-tiers";
import { useNotification } from "../global/components/notification-center";
import { getBackendBaseUrl } from "../../lib/backend-url";

const TABLE_COLUMN_COUNT = 14;

export function ProductsTable({ boxTypeId = 1 }: { boxTypeId?: number }) {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const products = useTableEComStore((s) => s.products);
  const isLoading = useTableEComStore((s) => s.isLoading);
  const loadError = useTableEComStore((s) => s.loadError);
  const loadProducts = useTableEComStore((s) => s.loadProducts);
  const incrementProducts = useTableEComStore((s) => s.increment);
  const decrementProducts = useTableEComStore((s) => s.decrement);
  const addPallet = useTableEComStore((s) => s.addPallet);
  const removePallet = useTableEComStore((s) => s.removePallet);
  const resetAmountQty = useTableEComStore((s) => s.resetAmountQty);
  const addCartItem = useCartStore((s) => s.addItem);
  const { notify } = useNotification();
  const [animatedItemNo, setAnimatedItemNo] = useState<string | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const holdTimeoutRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  const stopHold = () => {
    if (holdTimeoutRef.current != null) {
      window.clearTimeout(holdTimeoutRef.current);
      holdTimeoutRef.current = null;
    }
    if (holdIntervalRef.current != null) {
      window.clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  };

  const startHold = (action: () => void) => {
    stopHold();
    action();
    holdTimeoutRef.current = window.setTimeout(() => {
      holdIntervalRef.current = window.setInterval(action, 80);
    }, 350);
  };

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    void loadProducts({ backendBaseUrl, boxTypeId });
  }, [backendBaseUrl, boxTypeId, loadProducts]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current != null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
      stopHold();
    };
  }, []);

  const triggerAddToCartAnimation = (itemNo: string) => {
    if (animationTimeoutRef.current != null) {
      window.clearTimeout(animationTimeoutRef.current);
    }
    setAnimatedItemNo(itemNo);
    animationTimeoutRef.current = window.setTimeout(() => {
      setAnimatedItemNo((current) => (current === itemNo ? null : current));
    }, 700);
  };

  return (
    <div className="overflow-hidden rounded-xl border border-my-light-gray">
      <div className="border-b border-my-light-gray bg-my-light-gray2 px-4 py-4 sm:px-5">
        <p className="text-sm font-semibold text-gray-900">
          {t("productTable.howToOrderTitle")}
        </p>
        <ol className="mt-3 grid gap-2 text-sm text-gray-700 sm:grid-cols-3">
          <li className="flex items-start gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-my-yellow text-xs font-bold text-black">
              1
            </span>
            <span>{t("productTable.howToOrderStep1")}</span>
          </li>
          <li className="flex items-start gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-my-red text-xs font-bold text-white">
              2
            </span>
            <span>{t("productTable.howToOrderStep2")}</span>
          </li>
          <li className="flex items-start gap-2 rounded-lg border border-white bg-white px-3 py-2 shadow-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-my-blue text-xs font-bold text-white">
              3
            </span>
            <span>{t("productTable.howToOrderStep3")}</span>
          </li>
        </ol>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          {Headers()}
          {TableBody()}
        </table>
      </div>
    </div>
  );

  function TableBody() {
    return (
      <tbody className="divide-y text-center">
        {isLoading ? (
          <tr>
            <td className="px-3 py-6 text-left text-gray-500" colSpan={TABLE_COLUMN_COUNT}>
              {t("productTable.loading")}
            </td>
          </tr>
        ) : null}
        {!isLoading && loadError ? (
          <tr>
            <td className="px-3 py-6 text-left text-red-600" colSpan={TABLE_COLUMN_COUNT}>
              {t("productTable.loadError")}: {loadError}
            </td>
          </tr>
        ) : null}
        {products.map((product: Product) => (
          <tr key={product.itemNo} className="hover:bg-my-light-gray">
            {(() => {
              const qtyToAdd = Number(product.amountQtyInPcs);
              const canAddToCart =
                Number.isFinite(qtyToAdd) && qtyToAdd >= MIN_ORDER_QTY;
              const displayPrices = getShopPriceTiers(product.prices);
              const basePrice = getMinOrderUnitPrice(product.prices);
              const isAnimated = animatedItemNo === product.itemNo;

              return (
                <>
                  <td className="px-3 py-2 text-left font-medium">
                    {product.itemNo}
                  </td>
                  <td className="px-3 py-2 text-left">{product.name}</td>
                  <td className="px-3 py-2">{product.internalDimensionsMM.l}</td>
                  <td className="px-3 py-2">{product.internalDimensionsMM.w}</td>
                  <td className="px-3 py-2">
                    {Array.isArray(product.internalDimensionsMM.h)
                      ? product.internalDimensionsMM.h.join(" / ")
                      : product.internalDimensionsMM.h}
                  </td>
                  <td className="px-3 py-2">{product.qualityCardboard}</td>
                  <td className="px-3 py-2">{product.palletDimensionsCM.l}</td>
                  <td className="px-3 py-2">{product.palletDimensionsCM.w}</td>
                  <td className="px-3 py-2">{product.palletDimensionsCM.h}</td>
                  <td className="px-3 py-2">
                    {product.weightPieceGr} / {product.weightPalletKg}
                  </td>

                  {SHOP_PRICE_TIER_NAMES.map((tierName) => {
                    const price = displayPrices.find((tier) => tier.name === tierName);
                    return (
                      <td
                        key={tierName}
                        className="whitespace-nowrap px-3 py-2 text-center"
                      >
                        {price ? (
                          <>
                            <div>{formatPrice(price.withoutTax)}</div>
                            <div className="font-semibold">{formatPrice(price.withTax)}</div>
                          </>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                    );
                  })}

                  <td className="min-w-[270px] px-3 py-1.5">
                    <div className="mx-auto flex w-full max-w-[300px] flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <div
                          role="group"
                          aria-label={t("productTable.quantityLabel")}
                          className="flex h-8 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-gray-300 bg-white"
                        >
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              startHold(() => decrementProducts(product.itemNo));
                            }}
                            onPointerUp={stopHold}
                            onPointerLeave={stopHold}
                            onPointerCancel={stopHold}
                            className="inline-flex h-full w-7 shrink-0 items-center justify-center border-r border-gray-300 bg-gray-50 text-gray-800 transition hover:bg-gray-100 select-none touch-none"
                            aria-label={t("productTable.decreaseQtyAria")}
                          >
                            <FaMinus className="h-2.5 w-2.5" />
                          </button>
                          <span className="min-w-0 flex-1 text-center text-sm font-bold tabular-nums text-gray-900">
                            {product.amountQtyInPcs}
                          </span>
                          <button
                            type="button"
                            onPointerDown={(event) => {
                              event.preventDefault();
                              startHold(() => incrementProducts(product.itemNo));
                            }}
                            onPointerUp={stopHold}
                            onPointerLeave={stopHold}
                            onPointerCancel={stopHold}
                            className="inline-flex h-full w-7 shrink-0 items-center justify-center border-l border-gray-300 bg-gray-50 text-gray-800 transition hover:bg-gray-100 select-none touch-none"
                            aria-label={t("productTable.increaseQtyAria")}
                          >
                            <FaPlus className="h-2.5 w-2.5" />
                          </button>
                        </div>

                        <button
                          type="button"
                          disabled={!canAddToCart}
                          onClick={() => {
                            if (!canAddToCart) return;
                            addCartItem({
                              itemNo: product.itemNo,
                              name: product.name,
                              imageUrl: product.imageUrl,
                              unitPrice: basePrice,
                              quantity: qtyToAdd,
                            });
                            notify({
                              type: "success",
                              message: t("productTable.addedNotification").replace(
                                "{{qty}}",
                                String(qtyToAdd),
                              ),
                            });
                            triggerAddToCartAnimation(product.itemNo);
                            resetAmountQty(product.itemNo);
                          }}
                          className={`inline-flex h-8 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-bold transition-all duration-300 ${
                            canAddToCart
                              ? isAnimated
                                ? "bg-green-600 text-white scale-[1.02]"
                                : "bg-my-yellow text-black hover:brightness-95"
                              : "cursor-not-allowed bg-gray-200 text-gray-500"
                          }`}
                        >
                          {isAnimated ? (
                            <FaCheck className="h-3 w-3" />
                          ) : (
                            <FaShoppingCart className="h-3 w-3" />
                          )}
                          {isAnimated
                            ? t("productTable.addedToCart")
                            : t("productTable.addToCart")}
                        </button>
                      </div>

                      {product.palletPcs > 0 ? (
                        <div className="flex h-7 items-center overflow-hidden rounded-md border border-my-red/25 bg-my-red/5">
                          <button
                            type="button"
                            disabled={
                              product.amountQtyInPcs - product.palletPcs <
                              MIN_ORDER_QTY
                            }
                            onClick={() => removePallet(product.itemNo)}
                            className="inline-flex h-full w-7 shrink-0 items-center justify-center border-r border-my-red/25 bg-white text-my-red transition hover:bg-my-red/10 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={t("productTable.removePalletAria")}
                          >
                            <FaMinus className="h-2.5 w-2.5" />
                          </button>
                          <span className="min-w-0 flex-1 truncate px-1 text-center text-[11px] leading-none">
                            <span className="font-semibold uppercase tracking-wide text-my-red">
                              {t("productTable.fullPalletLabel")}
                            </span>{" "}
                            <span className="font-semibold tabular-nums text-gray-800">
                              · {product.palletPcs} {t("productDemo.pcsAbbr")}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() => addPallet(product.itemNo)}
                            className="inline-flex h-full w-7 shrink-0 items-center justify-center bg-my-red text-white transition hover:brightness-95"
                            aria-label={t("productTable.addPalletAria")}
                          >
                            <FaPlus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </td>
                </>
              );
            })()}
          </tr>
        ))}
      </tbody>
    );
  }

  function Headers() {
    return (
      <thead className="bg-my-yellow">
        <tr>
          <th rowSpan={2} className="px-3 py-2 text-left">
            {t("productTable.itemNo")}
          </th>
          <th rowSpan={2} className="px-3 py-2 text-left">
            {t("productTable.name")}
          </th>
          <th colSpan={3} className="px-3 py-2 text-left">
            {t("productTable.internalDimensions")}
          </th>
          <th rowSpan={2} className="px-3 py-2 text-left">
            {t("productTable.qualityCardboard")}
          </th>
          <th colSpan={3} className="px-3 py-2 text-left">
            {t("productTable.palletSizes")}
          </th>
          <th rowSpan={2} className="whitespace-nowrap px-3 py-2 text-left">
            {t("productTable.weight")}
          </th>
          <th colSpan={3} className="px-3 py-2 text-center">
            {t("productTable.price")}
          </th>
          <th rowSpan={2} className="min-w-[270px] px-3 py-2 text-center">
            {t("productTable.orderColumn")}
          </th>
        </tr>
        <tr>
          <th>L</th>
          <th>W</th>
          <th>H</th>
          <th>L</th>
          <th>W</th>
          <th>H</th>
          <th className="px-3 py-2 text-center">{t("productTable.priceTier300")}</th>
          <th className="px-3 py-2 text-center">{t("productTable.priceTier500")}</th>
          <th className="px-3 py-2 text-center">{t("productTable.palletPcs")}</th>
        </tr>
      </thead>
    );
  }
}
