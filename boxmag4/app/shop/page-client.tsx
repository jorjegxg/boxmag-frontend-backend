"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../i18n/language-context";
import { boxTypeTitle } from "../i18n/box-type-title";
import { useCurrency } from "../currency/currency-context";
import { FaArrowRight, FaCheck, FaShoppingCart } from "react-icons/fa";
import { useCartStore } from "../stores/cart_store";
import { MIN_ORDER_QTY } from "../constants/order";
import { getMinOrderUnitPrice, getShopPriceTiers } from "../constants/price-tiers";
import { normalizeImageUrl } from "@/app/utils/normalize-image-url";
import { getBackendBaseUrl } from "../../lib/backend-url";

type BoxType = {
  id: number;
  title: string;
  key: string;
  images: Array<{
    id: number;
    url: string;
    sortOrder: number;
    altText: string | null;
    isPrimary: boolean;
  }>;
  isActive: boolean;
};

type BoxTypeProduct = {
  id: number;
  boxTypeId: number;
  itemNo: string;
  productName: string;
  internalDimensionsMM?: {
    l: number;
    w: number;
    h: number;
  };
  prices: Array<{
    id: number;
    name: string;
    withoutTax: number;
    withTax: number;
  }>;
};

function resolvePrimaryImageUrl(
  baseUrl: string,
  images: Array<{ url: string; isPrimary: boolean }>,
): string {
  const primary = images.find((image) => image.isPrimary) ?? images[0];
  return normalizeImageUrl(baseUrl, primary?.url ?? "");
}

type ShopCard = {
  boxType: BoxType;
  products: BoxTypeProduct[];
  minPrice: number | null;
  sizeSummary: string | null;
};

/** Price shown on a shop card: the "300" tier with tax, else the first shop tier. */
function cardPrice(prices: BoxTypeProduct["prices"]): number | null {
  const shopPrices = getShopPriceTiers(prices);
  const price = shopPrices.find((tier) => tier.name === "300") ?? shopPrices[0];
  return price ? price.withTax : null;
}

function formatRange(values: number[]): string {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max ? String(min) : `${min}–${max}`;
}

/** "160 x 130 x 80 mm" for one size, per-axis ranges ("160–350 x …") for several. */
function summarizeSizes(products: BoxTypeProduct[]): string | null {
  const dims = products
    .map((product) => product.internalDimensionsMM)
    .filter(
      (d): d is { l: number; w: number; h: number } =>
        typeof d?.l === "number" && typeof d?.w === "number" && typeof d?.h === "number",
    );
  if (dims.length === 0) return null;
  return `${formatRange(dims.map((d) => d.l))} x ${formatRange(dims.map((d) => d.w))} x ${formatRange(dims.map((d) => d.h))} mm`;
}

function ShopPageContent() {
  const { t } = useLanguage();
  const { formatPrice } = useCurrency();
  const addCartItem = useCartStore((s) => s.addItem);
  const searchParams = useSearchParams();
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [products, setProducts] = useState<BoxTypeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [animatedProductId, setAnimatedProductId] = useState<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const selectedBoxTypeId = useMemo(() => {
    const param = searchParams.get("boxTypeId");
    if (!param) return null;
    const parsed = Number(param);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }, [searchParams]);

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    const loadData = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const boxTypesResponse = await fetch(`${backendBaseUrl}/api/box-types`, {
          signal: controller.signal,
        });
        const boxTypesPayload = (await boxTypesResponse.json()) as {
          ok?: boolean;
          message?: string;
          data?: Array<{
            id: number;
            title: string;
            key: string;
            images: Array<{
              id: number;
              url: string;
              sortOrder: number;
              altText: string | null;
              isPrimary: boolean;
            }>;
            isActive: boolean;
          }>;
        };
        if (
          !boxTypesResponse.ok ||
          boxTypesPayload.ok !== true ||
          !Array.isArray(boxTypesPayload.data)
        ) {
          throw new Error(boxTypesPayload.message ?? "Failed to load box types");
        }

        const activeTypes = boxTypesPayload.data
          .filter((type) => type.isActive)
          .map((type) => ({
            ...type,
            key: String(type.key ?? ""),
          }));
        const typeMap = new Map(activeTypes.map((type) => [type.id, type]));
        const targetTypes =
          selectedBoxTypeId && typeMap.has(selectedBoxTypeId)
            ? [typeMap.get(selectedBoxTypeId)!]
            : activeTypes;

        const allProducts = await Promise.all(
          targetTypes.map(async (type) => {
            const productsResponse = await fetch(
              `${backendBaseUrl}/api/box-types/${type.id}/products`,
              { signal: controller.signal },
            );
            const productsPayload = (await productsResponse.json()) as {
              ok?: boolean;
              message?: string;
              data?: Array<{
                id: number;
                boxTypeId: number;
                itemNo: string;
                productName: string;
                internalDimensionsMM?: {
                  l: number;
                  w: number;
                  h: number;
                };
                prices?: Array<{
                  id: number;
                  name: string;
                  withoutTax: number;
                  withTax: number;
                }>;
              }>;
            };
            if (
              !productsResponse.ok ||
              productsPayload.ok !== true ||
              !Array.isArray(productsPayload.data)
            ) {
              throw new Error(productsPayload.message ?? "Failed to load products");
            }

            return productsPayload.data.map((product) => ({
              id: product.id,
              boxTypeId: type.id,
              itemNo: String(product.itemNo ?? ""),
              productName: String(product.productName ?? ""),
              internalDimensionsMM: product.internalDimensionsMM,
              prices: Array.isArray(product.prices) ? product.prices : [],
            }));
          }),
        );

        if (cancelled) return;
        setBoxTypes(activeTypes);
        setProducts(allProducts.flat());
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load shop");
        setProducts([]);
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void loadData();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [backendBaseUrl, selectedBoxTypeId]);

  // One card per box type: the size is picked on the product page.
  const cards = useMemo<ShopCard[]>(() => {
    const productsByType = new Map<number, BoxTypeProduct[]>();
    for (const product of products) {
      const list = productsByType.get(product.boxTypeId) ?? [];
      list.push(product);
      productsByType.set(product.boxTypeId, list);
    }
    return boxTypes.flatMap((boxType) => {
      const typeProducts = productsByType.get(boxType.id) ?? [];
      if (typeProducts.length === 0) return [];
      const prices = typeProducts
        .map((product) => cardPrice(product.prices))
        .filter((price): price is number => price != null);
      return [
        {
          boxType,
          products: typeProducts,
          minPrice: prices.length > 0 ? Math.min(...prices) : null,
          sizeSummary: summarizeSizes(typeProducts),
        },
      ];
    });
  }, [boxTypes, products]);

  useEffect(() => {
    return () => {
      if (animationTimeoutRef.current != null) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, []);

  const triggerAddToCartAnimation = (productId: number) => {
    if (animationTimeoutRef.current != null) {
      window.clearTimeout(animationTimeoutRef.current);
    }
    setAnimatedProductId(productId);
    animationTimeoutRef.current = window.setTimeout(() => {
      setAnimatedProductId((current) => (current === productId ? null : current));
    }, 700);
  };

  return (
    <section className="w-full bg-white px-6 py-8 lg:px-20">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 text-xs uppercase tracking-wide text-gray-500 lg:text-sm">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>
          <span className="mx-2">→</span>
          <span className="font-semibold text-gray-700">{t("footer.shop")}</span>
        </div>

        <h1 className="mb-6 text-2xl font-extrabold uppercase tracking-wide text-black lg:text-3xl">
          {t("shop.title")}
        </h1>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside className="rounded-xl border border-my-light-gray bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              {t("shop.categories")}
            </p>
            <div className="flex flex-wrap gap-2 lg:flex-col lg:gap-1">
              <Link
                href="/shop"
                className={`rounded-md border px-3 py-2 text-sm transition lg:w-full ${
                  selectedBoxTypeId == null
                    ? "border-my-blue bg-my-blue text-white"
                    : "border-my-light-gray text-black hover:bg-gray-50"
                }`}
              >
                {t("common.all")}
              </Link>
              {boxTypes.map((type) => (
                <Link
                  key={type.id}
                  href={`/shop?boxTypeId=${type.id}`}
                  className={`rounded-md border px-3 py-2 text-sm transition lg:w-full ${
                    selectedBoxTypeId === type.id
                      ? "border-my-blue bg-my-blue text-white"
                      : "border-my-light-gray text-black hover:bg-gray-50"
                  }`}
                >
                  {boxTypeTitle(t, type.key, type.title)}
                </Link>
              ))}
            </div>
          </aside>

          <div>
            {isLoading ? (
              <p className="text-sm text-gray-500">{t("shop.loading")}</p>
            ) : loadError ? (
              <p className="text-sm text-red-600">{t("productTable.loadError")}</p>
            ) : cards.length === 0 ? (
              <p className="text-sm text-gray-500">{t("shop.emptyFilter")}</p>
            ) : (
              <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {cards.map(({ boxType, products: typeProducts, minPrice, sizeSummary }) => {
                  const single = typeProducts.length === 1 ? typeProducts[0] : null;
                  const title = boxTypeTitle(t, boxType.key, boxType.title);
                  const imageUrl = resolvePrimaryImageUrl(backendBaseUrl, boxType.images);
                  const boxTypeKey = boxType.key.trim();
                  const detailsHref =
                    boxTypeKey.length > 0
                      ? `/products/${encodeURIComponent(boxTypeKey)}${
                          single ? `?itemNo=${encodeURIComponent(single.itemNo)}` : ""
                        }`
                      : null;
                  const isAnimated = single != null && animatedProductId === single.id;
                  const card = (
                    <article className="flex h-full flex-col rounded-xl border border-my-light-gray bg-white p-4 shadow-sm transition hover:border-my-yellow hover:shadow-md">
                      <div className="mb-4 h-44 w-full shrink-0 overflow-hidden rounded-lg bg-my-light-gray2">
                        <img src={imageUrl} alt={title} className="h-full w-full object-contain" />
                      </div>
                      <h2
                        className="line-clamp-2 min-h-12 text-base font-semibold leading-snug text-black"
                        title={title}
                      >
                        {title}
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">
                        {single
                          ? `${t("shop.codeLabel")} ${single.itemNo}`
                          : t("shop.sizesAvailable").replace("{{count}}", String(typeProducts.length))}
                      </p>
                      <p className="mt-1 min-h-5 text-sm text-gray-600">
                        {sizeSummary
                          ? single
                            ? `${t("shop.sizeLabel")} ${sizeSummary}`
                            : sizeSummary
                          : "\u00a0"}
                      </p>
                      <div className="mt-auto pt-3">
                        <p className="text-sm font-semibold text-black">
                          {minPrice != null
                            ? `${t("shop.priceFrom")} ${formatPrice(minPrice)}`
                            : t("shop.priceOnRequest")}
                        </p>
                        {single ? (
                          <button
                            type="button"
                            onClick={(event) => {
                              event.preventDefault();
                              event.stopPropagation();
                              addCartItem({
                                itemNo: single.itemNo,
                                name: single.productName,
                                unitPrice: getMinOrderUnitPrice(single.prices),
                                quantity: MIN_ORDER_QTY,
                                imageUrl,
                              });
                              triggerAddToCartAnimation(single.id);
                            }}
                            className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                              isAnimated
                                ? "border-green-600 bg-green-600 text-white scale-105"
                                : "border-my-red text-my-red hover:bg-my-red hover:text-white"
                            }`}
                          >
                            {isAnimated ? (
                              <FaCheck className="h-3.5 w-3.5" />
                            ) : (
                              <FaShoppingCart className="h-3.5 w-3.5" />
                            )}
                            {isAnimated
                              ? t("productTable.addedToCart")
                              : t("productTable.addToCart")}
                          </button>
                        ) : (
                          <span className="mt-3 inline-flex items-center gap-2 rounded-lg border border-my-red px-3 py-2 text-xs font-semibold text-my-red transition group-hover:bg-my-red group-hover:text-white">
                            {t("shop.chooseSize")}
                            <FaArrowRight className="h-3 w-3" />
                          </span>
                        )}
                      </div>
                    </article>
                  );
                  return detailsHref ? (
                    <Link key={boxType.id} href={detailsHref} className="group block h-full">
                      {card}
                    </Link>
                  ) : (
                    <div key={boxType.id} className="h-full">
                      {card}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

export default function ShopPage() {
  return (
    <Suspense fallback={null}>
      <ShopPageContent />
    </Suspense>
  );
}
