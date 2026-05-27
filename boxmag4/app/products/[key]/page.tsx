"use client";

import { Minus, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { useLanguage } from "../../i18n/language-context";
import { B2b } from "../../global/components/b2b";
import { NewsletterSubscribe } from "../../global/components/newsletter-subscribe";
import { useCartStore } from "../../stores/cart_store";
import { MIN_ORDER_QTY } from "../../constants/order";
import { FaCheck } from "react-icons/fa";
const BOXES_PER_PALLET = 9000;
const imageRequestCache = new Set<string>();

function normalizeImageUrl(baseUrl: string, imagePath: string): string {
  const trimmed = imagePath.trim();
  if (!trimmed) return "/placeholders/box4.png";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  const normalizedPath = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return `${baseUrl}${normalizedPath}`;
}

type BoxTypeApi = {
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

type BoxTypeProductApi = {
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

export default function ProductByKeyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useLanguage();
  const keyParam = typeof params.key === "string" ? params.key : "";
  const itemNoQuery = searchParams.get("itemNo")?.trim() ?? "";

  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(MIN_ORDER_QTY);

  const [loadState, setLoadState] = useState<
    "idle" | "loading" | "error" | "notFound" | "ready"
  >("idle");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allProducts, setAllProducts] = useState<BoxTypeProductApi[]>([]);
  const [productName, setProductName] = useState("");
  const [itemNo, setItemNo] = useState("");
  const [sizeLabel, setSizeLabel] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(["/placeholders/box4.png"]);
  const [selectedProductPrices, setSelectedProductPrices] = useState<
    Array<{ id: number; name: string; withoutTax: number; withTax: number }>
  >([]);
  const [firstWithTax, setFirstWithTax] = useState<number | null>(null);
  const [firstWithoutTax, setFirstWithoutTax] = useState<number | null>(null);
  const [isAddToCartAnimated, setIsAddToCartAnimated] = useState(false);
  const addToCartAnimationTimeoutRef = useRef<number | null>(null);
  const addCartItem = useCartStore((s) => s.addItem);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const formatSizeLabel = (product: BoxTypeProductApi): string => {
    const dims = product.internalDimensionsMM;
    return typeof dims?.l === "number" &&
      typeof dims?.w === "number" &&
      typeof dims?.h === "number"
      ? `${dims.l} x ${dims.w} x ${dims.h} mm`
      : "";
  };

  const applyProductSelection = (product: BoxTypeProductApi, normalizedImageUrls: string[]) => {
    const firstPrice = Array.isArray(product.prices) ? product.prices[0] : undefined;

    setProductName(String(product.productName ?? ""));
    setItemNo(String(product.itemNo ?? ""));
    setSizeLabel(formatSizeLabel(product));
    setImageUrls(normalizedImageUrls.length > 0 ? normalizedImageUrls : ["/placeholders/box4.png"]);
    setSelectedProductPrices(Array.isArray(product.prices) ? product.prices : []);
    setFirstWithTax(
      firstPrice && typeof firstPrice.withTax === "number" ? firstPrice.withTax : null,
    );
    setFirstWithoutTax(
      firstPrice && typeof firstPrice.withoutTax === "number" ? firstPrice.withoutTax : null,
    );
    setSelectedImage(0);
  };

  useEffect(() => {
    if (!keyParam) {
      setLoadState("notFound");
      return;
    }

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      setLoadState("loading");
      setLoadError(null);

      try {
        const boxTypesResponse = await fetch(`${backendBaseUrl}/api/box-types`, {
          signal: controller.signal,
        });
        const boxTypesPayload = (await boxTypesResponse.json()) as {
          ok?: boolean;
          message?: string;
          data?: BoxTypeApi[];
        };

        if (
          !boxTypesResponse.ok ||
          boxTypesPayload.ok !== true ||
          !Array.isArray(boxTypesPayload.data)
        ) {
          throw new Error(boxTypesPayload.message ?? "Failed to load box types");
        }

        const decodedKey = decodeURIComponent(keyParam);
        const boxType = boxTypesPayload.data.find(
          (bt) => bt.key === decodedKey && bt.isActive,
        );

        if (!boxType) {
          if (!cancelled) setLoadState("notFound");
          return;
        }

        const productsResponse = await fetch(
          `${backendBaseUrl}/api/box-types/${boxType.id}/products`,
          { signal: controller.signal },
        );
        const productsPayload = (await productsResponse.json()) as {
          ok?: boolean;
          message?: string;
          data?: BoxTypeProductApi[];
        };

        if (
          !productsResponse.ok ||
          productsPayload.ok !== true ||
          !Array.isArray(productsPayload.data)
        ) {
          throw new Error(productsPayload.message ?? "Failed to load products");
        }

        const products = productsPayload.data;
        if (products.length === 0) {
          if (!cancelled) setLoadState("notFound");
          return;
        }

        const matched =
          itemNoQuery.length > 0
            ? products.find((p) => String(p.itemNo ?? "") === itemNoQuery)
            : undefined;
        const product = matched ?? products[0];

        let gallery = boxType.images
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((image) => normalizeImageUrl(backendBaseUrl, image.url));
        const primary = boxType.images.find((image) => image.isPrimary);
        if (primary) {
          const primaryUrl = normalizeImageUrl(backendBaseUrl, primary.url);
          gallery = [primaryUrl, ...gallery.filter((url) => url !== primaryUrl)];
        }

        if (cancelled) return;

        setAllProducts(products);
        applyProductSelection(product, gallery);
        setLoadState("ready");
      } catch (error) {
        if (cancelled || controller.signal.aborted) return;
        setLoadError(error instanceof Error ? error.message : "Failed to load product");
        setLoadState("error");
      }
    };

    void load();

    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [backendBaseUrl, keyParam, itemNoQuery]);

  const displayGrossPrice =
    firstWithTax != null && Number.isFinite(firstWithTax)
      ? `${(firstWithTax * quantity).toFixed(2)} euro`
      : "—";
  const displayNetPrice =
    firstWithoutTax != null && Number.isFinite(firstWithoutTax)
      ? `${(firstWithoutTax * quantity).toFixed(2)} euro ${t("productDemo.withoutVat")}`
      : `— ${t("productDemo.withoutVat")}`;

  const galleryWithProduct = useMemo(() => imageUrls, [imageUrls]);

  useEffect(() => {
    for (const imageUrl of galleryWithProduct) {
      if (!imageUrl || imageRequestCache.has(imageUrl)) continue;
      const preloadedImage = new Image();
      preloadedImage.decoding = "async";
      preloadedImage.src = imageUrl;
      imageRequestCache.add(imageUrl);
    }
  }, [galleryWithProduct]);

  const priceBreaks = useMemo(
    () =>
      selectedProductPrices.map((price) => ({
        qty: price.name,
        gross: `${price.withTax.toFixed(2)} euro`,
        net: `${price.withoutTax.toFixed(2)} euro`,
      })),
    [selectedProductPrices],
  );
  const imageUrlForCurrentBoxType = imageUrls;

  useEffect(() => {
    return () => {
      if (addToCartAnimationTimeoutRef.current != null) {
        window.clearTimeout(addToCartAnimationTimeoutRef.current);
      }
    };
  }, []);

  const triggerAddToCartAnimation = () => {
    if (addToCartAnimationTimeoutRef.current != null) {
      window.clearTimeout(addToCartAnimationTimeoutRef.current);
    }
    setIsAddToCartAnimated(true);
    addToCartAnimationTimeoutRef.current = window.setTimeout(() => {
      setIsAddToCartAnimated(false);
    }, 700);
  };

  if (loadState === "loading" || loadState === "idle") {
    return (
      <div>
        <B2b />
        <main className="w-full bg-[#f8f8f8] px-4 py-8 lg:px-12">
          <section className="mx-auto max-w-7xl rounded-3xl border border-black/10 bg-white p-4 shadow-sm lg:p-8">
            <div className="mb-5 h-4 w-2/3 animate-pulse rounded bg-gray-200" />
            <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr_260px]">
              <div>
                <div className="h-[320px] w-[423px] max-w-full animate-pulse rounded-2xl border border-gray-200 bg-gray-200" />
                <div className="mt-5 flex flex-wrap gap-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={`thumb-skeleton-${index}`}
                      className="h-[68px] w-[82px] animate-pulse rounded-xl border border-gray-200 bg-gray-200"
                    />
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <div className="h-10 w-4/5 animate-pulse rounded bg-gray-200" />
                <div className="h-5 w-1/2 animate-pulse rounded bg-gray-200" />
                <div className="h-10 w-1/3 animate-pulse rounded bg-gray-200" />
                <div className="h-16 w-2/3 animate-pulse rounded bg-gray-200" />
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
                  <div className="h-20 animate-pulse rounded-xl bg-gray-200" />
                </div>
                <div className="h-12 w-full animate-pulse rounded-xl bg-gray-200" />
              </div>

              <aside className="rounded-2xl border border-gray-200 bg-[#f4f4f4] p-3">
                <div className="mb-2 grid grid-cols-[1fr_1fr] gap-2">
                  <div className="h-6 animate-pulse rounded bg-gray-200" />
                  <div className="h-6 animate-pulse rounded bg-gray-200" />
                </div>
                <div className="space-y-2">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={`price-skeleton-${index}`}
                      className="h-12 animate-pulse rounded-md bg-gray-200"
                    />
                  ))}
                </div>
              </aside>
            </div>
          </section>
        </main>
        <NewsletterSubscribe />
      </div>
    );
  }

  if (loadState === "error") {
    return (
      <div>
        <B2b />
        <main className="w-full bg-[#f8f8f8] px-4 py-8 lg:px-12">
          <p className="mx-auto max-w-7xl text-sm text-red-600">{loadError}</p>
        </main>
        <NewsletterSubscribe />
      </div>
    );
  }

  if (loadState === "notFound") {
    return (
      <div>
        <B2b />
        <main className="w-full bg-[#f8f8f8] px-4 py-8 lg:px-12">
          <p className="mx-auto max-w-7xl text-sm text-gray-600">Product not found.</p>
        </main>
        <NewsletterSubscribe />
      </div>
    );
  }

  return (
    <div>
      <B2b />
      <main className="w-full bg-[#f8f8f8] px-4 py-8 lg:px-12">
        <section className="mx-auto max-w-7xl rounded-3xl border border-black/10 bg-white p-4 shadow-sm lg:p-8">
          <p className="mb-5 text-xs text-gray-500 lg:text-sm">
            {t("productDemo.breadcrumbStore")} {" > "} {t("productDemo.breadcrumbCategory")} {" > "}{" "}
            {productName} {sizeLabel}
          </p>

          <div className="grid gap-8 lg:grid-cols-[1.1fr_1fr_260px]">
            <div>
              <div className="relative flex h-[320px] w-[423px] max-w-full items-center justify-center rounded-2xl border border-gray-200 bg-[#f6f1e8] p-6">
                <img
                  src={galleryWithProduct[selectedImage]}
                  alt={productName}
                  width={430}
                  height={320}
                  loading="eager"
                  fetchPriority="high"
                  decoding="async"
                  className="h-full w-full max-h-full max-w-full object-contain"
                />
              </div>

              <div className="mt-5 flex flex-wrap gap-3">
                {galleryWithProduct.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    onClick={() => setSelectedImage(index)}
                    className={`rounded-xl border p-1 transition ${
                      selectedImage === index
                        ? "border-my-yellow ring-2 ring-my-yellow/40"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                    aria-label={`${t("productDemo.imageAria")} ${index + 1}`}
                  >
                    <img
                      src={src}
                      alt={`Thumbnail ${index + 1}`}
                      width={72}
                      height={72}
                      loading="lazy"
                      decoding="async"
                      className="h-[58px] w-[72px] rounded-lg object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <h1 className="text-3xl font-extrabold leading-tight text-black">
                {productName}
                <br />
                {sizeLabel}
              </h1>

              <p className="mt-2 text-sm text-gray-700">
                <span className="font-semibold text-green-700">● {t("productDemo.inStore")}</span> |{" "}
                {t("productDemo.reference")}:
                <span className="font-semibold"> {itemNo}</span>
              </p>

              {allProducts.length > 1 ? (
                <div className="mt-4">
                  <label className="mb-2 block text-sm font-semibold text-gray-700" htmlFor="size-option">
                    Marime produs
                  </label>
                  <select
                    id="size-option"
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-black"
                    value={itemNo}
                    onChange={(event) => {
                      const nextItemNo = event.target.value;
                      const nextProduct = allProducts.find((product) => product.itemNo === nextItemNo);
                      if (!nextProduct) return;
                      applyProductSelection(nextProduct, imageUrlForCurrentBoxType);
                    }}
                  >
                    {allProducts.map((product) => {
                      const optionSize = formatSizeLabel(product);
                      return (
                        <option key={product.id} value={product.itemNo}>
                          {optionSize ? `${optionSize} (${product.itemNo})` : product.itemNo}
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : null}

              <div className="mt-5 border-b border-gray-200 pb-5">
                <p className="text-5xl font-extrabold text-my-yellow">{displayGrossPrice}</p>
                <p className="text-lg text-gray-500">{displayNetPrice}</p>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">{t("productDemo.quantity")}</p>
                  <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-3 py-2">
                    <button
                      type="button"
                      onClick={() =>
                        setQuantity((prev) => Math.max(MIN_ORDER_QTY, prev - MIN_ORDER_QTY))
                      }
                      className="rounded-md p-1 text-gray-600 hover:bg-gray-200"
                      aria-label={t("productDemo.decreaseQuantityAria")}
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-lg font-bold">{quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity((prev) => prev + MIN_ORDER_QTY)}
                      className="rounded-md p-1 text-gray-600 hover:bg-gray-200"
                      aria-label={t("productDemo.increaseQuantityAria")}
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-semibold text-gray-700">{t("productDemo.addPallet")}</p>
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((prev) =>
                        prev < BOXES_PER_PALLET ? BOXES_PER_PALLET : prev + BOXES_PER_PALLET,
                      )
                    }
                    className="w-full rounded-xl bg-black px-4 py-3 text-base font-bold text-white hover:bg-black/90"
                  >
                    + {BOXES_PER_PALLET}
                  </button>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  addCartItem({
                    itemNo,
                    name: productName,
                    unitPrice: firstWithoutTax ?? 0,
                    quantity,
                    imageUrl: galleryWithProduct[selectedImage],
                  });
                  triggerAddToCartAnimation();
                }}
                className={`mt-4 w-full rounded-xl px-5 py-4 text-lg font-bold transition-all duration-300 ${
                  isAddToCartAnimated
                    ? "bg-green-600 text-white scale-[1.02]"
                    : "bg-my-yellow text-black hover:brightness-95"
                }`}
              >
                <span className="inline-flex items-center justify-center gap-2">
                  {isAddToCartAnimated ? <FaCheck className="h-4 w-4" /> : null}
                  {isAddToCartAnimated ? "Added" : t("productDemo.addToCart")}
                </span>
              </button>

              <p className="mt-3 text-sm text-gray-500">
                {t("productDemo.minOrderQty")} {MIN_ORDER_QTY}.
              </p>
            </div>

            <aside className="rounded-2xl border border-gray-200 bg-[#f4f4f4] p-3">
              <div className="mb-2 grid grid-cols-[1fr_1fr] gap-2 text-xs font-semibold text-gray-600">
                <span className="rounded-md bg-gray-200 px-2 py-1 text-center">
                  {t("productDemo.quantity")}
                </span>
                <span className="rounded-md bg-gray-200 px-2 py-1 text-center">
                  {t("productDemo.priceWithWithoutTax")}
                </span>
              </div>

              <div className="space-y-2">
                {priceBreaks.map((item) => (
                  <div
                    key={item.qty}
                    className="grid grid-cols-[1fr_1fr] gap-2 rounded-md bg-white p-2 text-sm"
                  >
                    <span className="font-semibold text-gray-700">{item.qty}</span>
                    <span className="text-right">
                      <strong>{item.gross}</strong>
                      <br />
                      <span className="text-gray-500">{item.net}</span>
                    </span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </section>
      </main>
      <NewsletterSubscribe />
    </div>
  );
}
