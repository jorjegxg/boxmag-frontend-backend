import type { MetadataRoute } from "next";
import { getSiteBaseUrl, getSitemapBackendBaseUrl } from "@/lib/site-url";

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

type SitemapEntry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority?: number;
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildStaticEntries(siteUrl: string): SitemapEntry[] {
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
      cache: "no-store",
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

/**
 * One entry per box type. The `?itemNo=` variants are deliberately excluded:
 * they render the same page and canonicalise to `/products/{key}`, so listing
 * them only makes them compete with the canonical URL.
 */
function buildProductEntriesForType(
  siteUrl: string,
  boxType: BoxTypeApi,
): SitemapEntry[] {
  const encodedKey = encodeURIComponent(boxType.key);

  return [
    {
      url: `${siteUrl}/products/${encodedKey}`,
      changeFrequency: "weekly",
      priority: 0.7,
    },
  ];
}

async function fetchProductEntries(siteUrl: string): Promise<SitemapEntry[]> {
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

      return buildProductEntriesForType(siteUrl, boxType);
    }),
  );

  return results.flatMap((result) =>
    result.status === "fulfilled" ? result.value : [],
  );
}

export async function collectSitemapEntries(): Promise<SitemapEntry[]> {
  const siteUrl = getSiteBaseUrl();
  const staticEntries = buildStaticEntries(siteUrl);

  try {
    const productEntries = await fetchProductEntries(siteUrl);
    return [...staticEntries, ...productEntries];
  } catch {
    return staticEntries;
  }
}

export function entriesToSitemapXml(entries: SitemapEntry[]): string {
  const urlNodes = entries
    .map((entry) => {
      const parts = [
        "<url>",
        `<loc>${escapeXml(entry.url)}</loc>`,
      ];

      if (entry.lastModified) {
        parts.push(`<lastmod>${entry.lastModified.toISOString()}</lastmod>`);
      }
      if (entry.changeFrequency) {
        parts.push(`<changefreq>${entry.changeFrequency}</changefreq>`);
      }
      if (typeof entry.priority === "number") {
        parts.push(`<priority>${entry.priority}</priority>`);
      }

      parts.push("</url>");
      return parts.join("");
    })
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urlNodes}</urlset>`;
}

export async function buildSitemapXml(): Promise<string> {
  const entries = await collectSitemapEntries();
  return entriesToSitemapXml(entries);
}

export function buildStaticSitemapXml(): string {
  const siteUrl = getSiteBaseUrl();
  return entriesToSitemapXml(buildStaticEntries(siteUrl));
}
