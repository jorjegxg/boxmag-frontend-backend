"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../i18n/language-context";
import { useCurrency } from "../currency/currency-context";
import { FaCheck, FaShoppingCart } from "react-icons/fa";
import { useCartStore } from "../stores/cart_store";
import { MIN_ORDER_QTY } from "../constants/order";
import { getMinOrderUnitPrice, getShopPriceTiers } from "../constants/price-tiers";
import { normalizeImageUrl } from "@/app/utils/normalize-image-url";

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
  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

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

  const activeBoxTypeById = useMemo(
    () => new Map(boxTypes.map((type) => [type.id, type])),
    [boxTypes],
  );

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

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[280px_1fr] lg:items-start">
          <aside className="rounded-xl border border-my-light-gray bg-white p-4">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500">
              Categorii
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
                  {type.title}
                </Link>
              ))}
            </div>
          </aside>

          <div>
            {isLoading ? (
              <p className="text-sm text-gray-500">Loading shop...</p>
            ) : loadError ? (
              <p className="text-sm text-red-600">{loadError}</p>
            ) : products.length === 0 ? (
              <p className="text-sm text-gray-500">Nu exista produse pentru filtrul selectat.</p>
            ) : (
              <div className="grid grid-cols-1 items-stretch gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => {
                  const boxType = activeBoxTypeById.get(product.boxTypeId);
                  const imageUrl = boxType
                    ? resolvePrimaryImageUrl(backendBaseUrl, boxType.images)
                    : "/placeholders/box4.png";
                  const shopPrices = getShopPriceTiers(product.prices);
                  const firstPrice =
                    shopPrices.find((price) => price.name === "300") ?? shopPrices[0];
                  const unitPrice = getMinOrderUnitPrice(product.prices);
                  const size =
                    typeof product.internalDimensionsMM?.l === "number" &&
                    typeof product.internalDimensionsMM?.w === "number" &&
                    typeof product.internalDimensionsMM?.h === "number"
                      ? `${product.internalDimensionsMM.l} x ${product.internalDimensionsMM.w} x ${product.internalDimensionsMM.h} mm`
                      : null;
                  const boxTypeKey = boxType?.key?.trim() ?? "";
                  const detailsHref =
                    boxTypeKey.length > 0
                      ? `/products/${encodeURIComponent(boxTypeKey)}?itemNo=${encodeURIComponent(product.itemNo)}`
                      : null;
                  const card = (
                    <article className="flex h-full flex-col rounded-xl border border-my-light-gray bg-white p-4 shadow-sm transition hover:border-my-yellow hover:shadow-md">
                      <div className="mb-4 h-44 w-full shrink-0 overflow-hidden rounded-lg bg-my-light-gray2">
                        <img
                          src={imageUrl}
                          alt={boxType?.title ?? product.productName}
                          className="h-full w-full object-contain"
                        />
                      </div>
                      <p
                        className="line-clamp-2 min-h-8 text-xs uppercase leading-snug tracking-wide text-gray-500"
                        title={boxType?.title ?? "Box Type"}
                      >
                        {boxType?.title ?? "Box Type"}
                      </p>
                      <h2
                        className="mt-1 line-clamp-2 min-h-12 text-base font-semibold leading-snug text-black"
                        title={product.productName}
                      >
                        {product.productName}
                      </h2>
                      <p className="mt-1 text-sm text-gray-600">Cod: {product.itemNo}</p>
                      <p className="mt-1 min-h-5 text-sm text-gray-600">
                        {size ? `Size: ${size}` : "\u00a0"}
                      </p>
                      <div className="mt-auto pt-3">
                        <p className="text-sm font-semibold text-black">
                          {firstPrice
                            ? `de la ${formatPrice(firstPrice.withTax)}`
                            : "Pret la cerere"}
                        </p>
                        <button
                          type="button"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            addCartItem({
                              itemNo: product.itemNo,
                              name: product.productName,
                              unitPrice,
                              quantity: MIN_ORDER_QTY,
                              imageUrl,
                            });
                            triggerAddToCartAnimation(product.id);
                          }}
                          className={`mt-3 inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-all duration-300 ${
                            animatedProductId === product.id
                              ? "border-green-600 bg-green-600 text-white scale-105"
                              : "border-my-red text-my-red hover:bg-my-red hover:text-white"
                          }`}
                        >
                          {animatedProductId === product.id ? (
                            <FaCheck className="h-3.5 w-3.5" />
                          ) : (
                            <FaShoppingCart className="h-3.5 w-3.5" />
                          )}
                          {animatedProductId === product.id ? "Added" : "Add to cart"}
                        </button>
                      </div>
                    </article>
                  );
                  return detailsHref ? (
                    <Link key={product.id} href={detailsHref} className="block h-full">
                      {card}
                    </Link>
                  ) : (
                    <div key={product.id} className="h-full">
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
