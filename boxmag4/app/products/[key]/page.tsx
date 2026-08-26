import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema, productSchema } from "@/lib/schema";
import { getShopPriceTiers } from "@/app/constants/price-tiers";
import { normalizeImageUrl } from "@/app/utils/normalize-image-url";
import { getSitemapBackendBaseUrl } from "@/lib/site-url";
import type { PriceTier } from "@/app/types/product";
import { JsonLd } from "../../global/components/json-ld";
import ProductByKeyClient from "./page-client";

const FETCH_TIMEOUT_MS = 8_000;
const REVALIDATE_SECONDS = 3600;

type BoxTypeApi = {
  id: number;
  key: string;
  title: string;
  isActive: boolean;
  images?: Array<{ url: string; altText: string | null; isPrimary: boolean }>;
};

type BoxTypeProductApi = {
  itemNo: string;
  productName: string;
  prices?: PriceTier[];
};

type ResolvedBoxType = {
  boxType: BoxTypeApi;
  products: BoxTypeProductApi[];
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * There is no by-key endpoint on the backend, so resolve the key from the list
 * the same way the client page does (`page-client.tsx`).
 */
async function resolveBoxType(key: string): Promise<ResolvedBoxType | null> {
  const backendBaseUrl = getSitemapBackendBaseUrl();

  const listPayload = await fetchJson<{ ok?: boolean; data?: BoxTypeApi[] }>(
    `${backendBaseUrl}/api/box-types`,
  );
  if (listPayload?.ok !== true || !Array.isArray(listPayload.data)) return null;

  const decodedKey = decodeURIComponent(key);
  const boxType = listPayload.data.find(
    (candidate) => candidate.key === decodedKey && candidate.isActive,
  );
  if (!boxType) return null;

  const productsPayload = await fetchJson<{
    ok?: boolean;
    data?: BoxTypeProductApi[];
  }>(`${backendBaseUrl}/api/box-types/${boxType.id}/products`);

  return {
    boxType,
    products:
      productsPayload?.ok === true && Array.isArray(productsPayload.data)
        ? productsPayload.data
        : [],
  };
}

function describe(boxType: BoxTypeApi, products: BoxTypeProductApi[]): string {
  const sizes = products.length;
  const sizeText =
    sizes > 0 ? `${sizes} stock ${sizes === 1 ? "size" : "sizes"}` : "stock sizes";

  return `${boxType.title} in corrugated cardboard — ${sizeText}, tiered pricing from 100 pcs and delivery across Europe. Order online from Boxmag.`;
}

/** Lowest and highest unit price without tax, across every size of this box type. */
function priceRange(products: BoxTypeProductApi[]): {
  low?: number;
  high?: number;
} {
  const unitPrices = products.flatMap((product) =>
    getShopPriceTiers(product.prices ?? []).map((tier) => tier.withoutTax),
  );
  const positive = unitPrices.filter((price) => price > 0);
  if (positive.length === 0) return {};

  return { low: Math.min(...positive), high: Math.max(...positive) };
}

function productImages(boxType: BoxTypeApi): string[] {
  const backendBaseUrl = getSitemapBackendBaseUrl();

  const urls = (boxType.images ?? [])
    .map((image) => normalizeImageUrl(backendBaseUrl, image.url ?? ""))
    .filter((url) => url.startsWith("http"));

  return [...new Set(urls)];
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ key: string }>;
}): Promise<Metadata> {
  const { key } = await params;
  const resolved = await resolveBoxType(key);
  const path = `/products/${encodeURIComponent(decodeURIComponent(key))}`;

  if (!resolved) {
    return buildMetadata({
      title: "Corrugated Box",
      description:
        "Corrugated cardboard boxes from Boxmag — stock sizes, tiered pricing and delivery across Europe.",
      path,
    });
  }

  const { boxType, products } = resolved;

  return buildMetadata({
    title: `${boxType.title} — Corrugated Boxes`,
    description: describe(boxType, products),
    path,
    image: productImages(boxType)[0],
  });
}

export default async function ProductByKeyPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key } = await params;
  const resolved = await resolveBoxType(key);
  const path = `/products/${encodeURIComponent(decodeURIComponent(key))}`;

  if (!resolved) {
    return <ProductByKeyClient />;
  }

  const { boxType, products } = resolved;
  const { low, high } = priceRange(products);

  return (
    <>
      <JsonLd
        data={[
          productSchema({
            name: boxType.title,
            description: describe(boxType, products),
            path,
            images: productImages(boxType),
            lowPriceEur: low,
            highPriceEur: high,
            sku: products[0]?.itemNo,
          }),
          breadcrumbSchema([
            { name: "Home", path: "/" },
            { name: "Shop", path: "/shop" },
            { name: boxType.title, path },
          ]),
        ]}
      />
      <ProductByKeyClient />
    </>
  );
}
