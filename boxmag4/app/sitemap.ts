import type { MetadataRoute } from "next";
import { getSiteBaseUrl, getSitemapBackendBaseUrl } from "@/lib/site-url";

export const runtime = "nodejs";
export const revalidate = 3600;

const FETCH_TIMEOUT_MS = 8_000;

type BoxTypeApi = {
  id: number;
  key: string;
  isActive: boolean;
};

type BoxTypeProductApi = {
  itemNo: string;
};

const STATIC_PAGES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "weekly", priority: 1 },
  { path: "/shop", changeFrequency: "daily", priority: 0.9 },
  { path: "/business", changeFrequency: "weekly", priority: 0.9 },
  { path: "/about", changeFrequency: "monthly", priority: 0.6 },
  { path: "/contact", changeFrequency: "monthly", priority: 0.6 },
  { path: "/delivery", changeFrequency: "monthly", priority: 0.6 },
  { path: "/how-to-buy", changeFrequency: "monthly", priority: 0.6 },
  { path: "/corrugated-envelopes", changeFrequency: "monthly", priority: 0.7 },
  { path: "/boxesfetco", changeFrequency: "monthly", priority: 0.7 },
  { path: "/privacy-policy", changeFrequency: "yearly", priority: 0.3 },
  { path: "/regulations", changeFrequency: "yearly", priority: 0.3 },
  { path: "/complaints-and-returns", changeFrequency: "yearly", priority: 0.3 },
];

function buildStaticEntries(siteUrl: string): MetadataRoute.Sitemap {
  const lastModified = new Date();

  return STATIC_PAGES.map((page) => ({
    url: page.path === "/" ? siteUrl : `${siteUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));
}

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      next: { revalidate },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function buildProductEntriesForType(
  siteUrl: string,
  boxType: BoxTypeApi,
  products: BoxTypeProductApi[],
): MetadataRoute.Sitemap {
  const encodedKey = encodeURIComponent(boxType.key);
  const entries: MetadataRoute.Sitemap = [
    {
      url: `${siteUrl}/products/${encodedKey}`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];

  for (const product of products) {
    const itemNo = String(product.itemNo ?? "").trim();
    if (!itemNo) continue;

    entries.push({
      url: `${siteUrl}/products/${encodedKey}?itemNo=${encodeURIComponent(itemNo)}`,
      changeFrequency: "weekly",
      priority: 0.65,
    });
  }

  return entries;
}

async function fetchProductUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const backendBaseUrl = getSitemapBackendBaseUrl();
  const boxTypesPayload = await fetchJson<{
    ok?: boolean;
    data?: BoxTypeApi[];
  }>(`${backendBaseUrl}/api/box-types`);

  if (boxTypesPayload?.ok !== true || !Array.isArray(boxTypesPayload.data)) {
    return [];
  }

  const activeTypes = boxTypesPayload.data.filter((type) => type.isActive && type.key);
  const results = await Promise.allSettled(
    activeTypes.map(async (boxType) => {
      const productsPayload = await fetchJson<{
        ok?: boolean;
        data?: BoxTypeProductApi[];
      }>(`${backendBaseUrl}/api/box-types/${boxType.id}/products`);

      if (
        productsPayload?.ok !== true ||
        !Array.isArray(productsPayload.data) ||
        productsPayload.data.length === 0
      ) {
        return [];
      }

      return buildProductEntriesForType(siteUrl, boxType, productsPayload.data);
    }),
  );

  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteBaseUrl();
  const staticEntries = buildStaticEntries(siteUrl);

  try {
    const productEntries = await fetchProductUrls(siteUrl);
    return [...staticEntries, ...productEntries];
  } catch {
    return staticEntries;
  }
}
