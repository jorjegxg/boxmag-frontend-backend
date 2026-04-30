"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useLanguage } from "../i18n/language-context";

type BoxType = {
  id: number;
  title: string;
  imagePath: string;
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

function normalizeImageUrl(baseUrl: string, imagePath: string): string {
  const trimmed = imagePath.trim();
  if (!trimmed) return "/placeholders/box4.png";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl}${normalizedPath}`;
}

export default function ShopPage() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [boxTypes, setBoxTypes] = useState<BoxType[]>([]);
  const [products, setProducts] = useState<BoxTypeProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
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
          data?: Array<{ id: number; title: string; imagePath: string; isActive: boolean }>;
        };
        if (
          !boxTypesResponse.ok ||
          boxTypesPayload.ok !== true ||
          !Array.isArray(boxTypesPayload.data)
        ) {
          throw new Error(boxTypesPayload.message ?? "Failed to load box types");
        }

        const activeTypes = boxTypesPayload.data.filter((type) => type.isActive);
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
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {products.map((product) => {
                  const boxType = activeBoxTypeById.get(product.boxTypeId);
                  const imageUrl = boxType
                    ? normalizeImageUrl(backendBaseUrl, boxType.imagePath)
                    : "/placeholders/box4.png";
                  const firstPrice = product.prices[0];
                  const size =
                    typeof product.internalDimensionsMM?.l === "number" &&
                    typeof product.internalDimensionsMM?.w === "number" &&
                    typeof product.internalDimensionsMM?.h === "number"
                      ? `${product.internalDimensionsMM.l} x ${product.internalDimensionsMM.w} x ${product.internalDimensionsMM.h} mm`
                      : null;
                  const detailsHref = `/produs-demo?productName=${encodeURIComponent(
                    product.productName
                  )}&itemNo=${encodeURIComponent(product.itemNo)}&size=${encodeURIComponent(
                    size ?? ""
                  )}&image=${encodeURIComponent(imageUrl)}&priceWithTax=${encodeURIComponent(
                    firstPrice ? String(firstPrice.withTax) : ""
                  )}&priceWithoutTax=${encodeURIComponent(
                    firstPrice ? String(firstPrice.withoutTax) : ""
                  )}`;
                  return (
                    <Link key={product.id} href={detailsHref} className="block">
                      <article className="rounded-xl border border-my-light-gray bg-white p-4 shadow-sm transition hover:border-my-yellow hover:shadow-md">
                        <div className="mb-4 h-44 w-full overflow-hidden rounded-lg bg-my-light-gray2">
                          <img
                            src={imageUrl}
                            alt={boxType?.title ?? product.productName}
                            className="h-full w-full object-contain"
                          />
                        </div>
                        <p className="text-xs uppercase tracking-wide text-gray-500">
                          {boxType?.title ?? "Box Type"}
                        </p>
                        <h2 className="mt-1 text-base font-semibold text-black">{product.productName}</h2>
                        <p className="mt-1 text-sm text-gray-600">Cod: {product.itemNo}</p>
                        {size ? <p className="mt-1 text-sm text-gray-600">Size: {size}</p> : null}
                        <p className="mt-3 text-sm font-semibold text-black">
                          {firstPrice ? `de la € ${firstPrice.withTax.toFixed(2)}` : "Pret la cerere"}
                        </p>
                      </article>
                    </Link>
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
