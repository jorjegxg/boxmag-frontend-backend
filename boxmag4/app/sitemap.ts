import type { MetadataRoute } from "next";
import { getBackendBaseUrl, getSiteBaseUrl } from "@/lib/site-url";

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

async function fetchProductUrls(siteUrl: string): Promise<MetadataRoute.Sitemap> {
  const backendBaseUrl = getBackendBaseUrl();

  try {
    const boxTypesResponse = await fetch(`${backendBaseUrl}/api/box-types`, {
      next: { revalidate: 3600 },
    });
    const boxTypesPayload = (await boxTypesResponse.json()) as {
      ok?: boolean;
      data?: BoxTypeApi[];
    };

    if (
      !boxTypesResponse.ok ||
      boxTypesPayload.ok !== true ||
      !Array.isArray(boxTypesPayload.data)
    ) {
      return [];
    }

    const activeTypes = boxTypesPayload.data.filter((type) => type.isActive && type.key);
    const productEntries: MetadataRoute.Sitemap = [];

    await Promise.all(
      activeTypes.map(async (boxType) => {
        const productsResponse = await fetch(
          `${backendBaseUrl}/api/box-types/${boxType.id}/products`,
          { next: { revalidate: 3600 } },
        );
        const productsPayload = (await productsResponse.json()) as {
          ok?: boolean;
          data?: BoxTypeProductApi[];
        };

        if (
          !productsResponse.ok ||
          productsPayload.ok !== true ||
          !Array.isArray(productsPayload.data) ||
          productsPayload.data.length === 0
        ) {
          return;
        }

        const encodedKey = encodeURIComponent(boxType.key);
        productEntries.push({
          url: `${siteUrl}/products/${encodedKey}`,
          changeFrequency: "weekly",
          priority: 0.7,
        });

        for (const product of productsPayload.data) {
          const itemNo = String(product.itemNo ?? "").trim();
          if (!itemNo) continue;

          productEntries.push({
            url: `${siteUrl}/products/${encodedKey}?itemNo=${encodeURIComponent(itemNo)}`,
            changeFrequency: "weekly",
            priority: 0.65,
          });
        }
      }),
    );

    return productEntries;
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteBaseUrl();
  const lastModified = new Date();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map((page) => ({
    url: page.path === "/" ? siteUrl : `${siteUrl}${page.path}`,
    lastModified,
    changeFrequency: page.changeFrequency,
    priority: page.priority,
  }));

  const productEntries = await fetchProductUrls(siteUrl);

  return [...staticEntries, ...productEntries];
}
