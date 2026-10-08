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

      {MobileCards()}

      <div className="hidden overflow-x-auto md:block">
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
              {t("productTable.loadError")}
            </td>
          </tr>
        ) : null}
        {products.map((product: Product) => (
          <tr key={product.itemNo} className="hover:bg-my-light-gray">
            {(() => {
              const displayPrices = getShopPriceTiers(product.prices);

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
                    {OrderControls(product)}
                  </td>
                </>
              );
            })()}
          </tr>
        ))}
      </tbody>
    );
  }

  function OrderControls(product: Product) {
    const qtyToAdd = Number(product.amountQtyInPcs);
    const canAddToCart = Number.isFinite(qtyToAdd) && qtyToAdd >= MIN_ORDER_QTY;
    const basePrice = getMinOrderUnitPrice(product.prices);
    const isAnimated = animatedItemNo === product.itemNo;

    return (
                    <div className="mx-auto flex w-full max-w-none flex-col gap-1.5 md:max-w-[300px] md:gap-1">
                      <div className="flex items-center gap-1.5">
                        <div
                          role="group"
                          aria-label={t("productTable.quantityLabel")}
                          className="flex h-10 min-w-0 flex-1 items-center overflow-hidden rounded-md border border-gray-300 bg-white md:h-8"
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
                            className="inline-flex h-full w-10 shrink-0 items-center justify-center border-r border-gray-300 md:w-7 bg-gray-50 text-gray-800 transition hover:bg-gray-100 select-none touch-none"
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
                            className="inline-flex h-full w-10 shrink-0 items-center justify-center border-l border-gray-300 md:w-7 bg-gray-50 text-gray-800 transition hover:bg-gray-100 select-none touch-none"
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
                          className={`inline-flex h-10 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md px-3 text-sm md:h-8 md:px-2.5 md:text-xs font-bold transition-all duration-300 ${
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
                        <div className="flex h-9 items-center overflow-hidden rounded-md border border-my-red/25 bg-my-red/5 md:h-7">
                          <button
                            type="button"
                            disabled={
                              product.amountQtyInPcs - product.palletPcs <
                              MIN_ORDER_QTY
                            }
                            onClick={() => removePallet(product.itemNo)}
                            className="inline-flex h-full w-10 shrink-0 items-center justify-center border-r border-my-red/25 md:w-7 bg-white text-my-red transition hover:bg-my-red/10 disabled:cursor-not-allowed disabled:opacity-40"
                            aria-label={t("productTable.removePalletAria")}
                          >
                            <FaMinus className="h-2.5 w-2.5" />
                          </button>
                          <span className="min-w-0 flex-1 truncate px-1 text-center text-xs leading-none md:text-[11px]">
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
                            className="inline-flex h-full w-10 shrink-0 items-center justify-center bg-my-red md:w-7 text-white transition hover:brightness-95"
                            aria-label={t("productTable.addPalletAria")}
                          >
                            <FaPlus className="h-2.5 w-2.5" />
                          </button>
                        </div>
                      ) : null}
                    </div>
    );
  }

  function formatHeight(product: Product) {
    const h = product.internalDimensionsMM.h;
    return Array.isArray(h) ? h.join(" / ") : h;
  }

  // Phones: one card per product instead of a 14-column table.
  function MobileCards() {
    const tierLabels = [
      t("productTable.priceTier300"),
      t("productTable.priceTier500"),
      t("productTable.palletPcs"),
    ];

    return (
      <div className="md:hidden">
        {isLoading ? (
          <p className="px-4 py-6 text-sm text-gray-500">{t("productTable.loading")}</p>
        ) : null}
        {!isLoading && loadError ? (
          <p className="px-4 py-6 text-sm text-red-600">
            {t("productTable.loadError")}: {loadError}
          </p>
        ) : null}
        <ul className="divide-y divide-my-light-gray">
          {products.map((product: Product) => {
            const displayPrices = getShopPriceTiers(product.prices);

            return (
              <li key={product.itemNo} className="px-4 py-4">
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="text-base font-bold text-gray-900">{product.name}</h3>
                  <span className="shrink-0 text-xs font-semibold text-gray-500">
                    {product.itemNo}
                  </span>
                </div>

                <dl className="mt-2 space-y-1 text-sm">
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">{t("productTable.internalDimensions")}</dt>
                    <dd className="text-right font-semibold tabular-nums text-gray-900">
                      {product.internalDimensionsMM.l} × {product.internalDimensionsMM.w} ×{" "}
                      {formatHeight(product)}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">{t("productTable.qualityCardboard")}</dt>
                    <dd className="text-right text-gray-900">{product.qualityCardboard}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">{t("productTable.palletSizes")}</dt>
                    <dd className="text-right tabular-nums text-gray-900">
                      {product.palletDimensionsCM.l} × {product.palletDimensionsCM.w} ×{" "}
                      {product.palletDimensionsCM.h}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-gray-500">{t("productTable.weight")}</dt>
                    <dd className="shrink-0 text-right tabular-nums text-gray-900">
                      {product.weightPieceGr} / {product.weightPalletKg}
                    </dd>
                  </div>
                </dl>

                <p className="mt-3 text-xs text-gray-500">{t("productTable.price")}</p>
                <div className="mt-1 grid grid-cols-3 gap-2 text-center text-sm">
                  {SHOP_PRICE_TIER_NAMES.map((tierName, index) => {
                    const price = displayPrices.find((tier) => tier.name === tierName);
                    return (
                      <div key={tierName} className="rounded-md bg-my-light-gray2 px-1 py-1.5">
                        <div className="text-[11px] font-semibold text-gray-600">
                          {tierLabels[index]}
                        </div>
                        {price ? (
                          <>
                            <div className="text-xs text-gray-600">
                              {formatPrice(price.withoutTax)}
                            </div>
                            <div className="font-bold">{formatPrice(price.withTax)}</div>
                          </>
                        ) : (
                          <div className="text-gray-400">—</div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="mt-3">{OrderControls(product)}</div>
              </li>
            );
          })}
        </ul>
      </div>
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
