import { absoluteUrl, SITE_NAME } from "./seo";
import { getSiteBaseUrl } from "./site-url";
import { siteEmails } from "./site-emails";

/**
 * Schema.org JSON-LD generators. Rendered by `app/global/components/json-ld.tsx`.
 * Validate output with https://search.google.com/test/rich-results.
 */

export type JsonLdObject = Record<string, unknown>;

/** NAP kept in sync with `app/global/components/footer.tsx`. */
const COMPANY = {
  legalName: "REKO PACKAGING",
  street: "Stefan cel Mare 131",
  postalCode: "725400",
  city: "Radauti",
  region: "Suceava",
  country: "RO",
  phone: "+40799553345",
  fax: "+40230565997",
} as const;

export function organizationSchema(): JsonLdObject {
  const siteUrl = getSiteBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${siteUrl}/#organization`,
    name: SITE_NAME,
    legalName: COMPANY.legalName,
    url: siteUrl,
    logo: absoluteUrl("/icon.png"),
    address: {
      "@type": "PostalAddress",
      streetAddress: COMPANY.street,
      postalCode: COMPANY.postalCode,
      addressLocality: COMPANY.city,
      addressRegion: COMPANY.region,
      addressCountry: COMPANY.country,
    },
    contactPoint: [
      {
        "@type": "ContactPoint",
        contactType: "sales",
        telephone: COMPANY.phone,
        ...(siteEmails.info ? { email: siteEmails.info } : {}),
        availableLanguage: ["en", "ro", "de"],
      },
    ],
    sameAs: ["https://rekopackaging.com"],
  };
}

export function webSiteSchema(): JsonLdObject {
  const siteUrl = getSiteBaseUrl();

  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    name: SITE_NAME,
    url: siteUrl,
    publisher: { "@id": `${siteUrl}/#organization` },
  };
}

export type BreadcrumbItem = { name: string; path: string };

export function breadcrumbSchema(items: BreadcrumbItem[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export type ProductSchemaInput = {
  name: string;
  description: string;
  path: string;
  images: string[];
  /** Lowest unit price without tax, in EUR. */
  lowPriceEur?: number;
  highPriceEur?: number;
  sku?: string;
};

export function productSchema({
  name,
  description,
  path,
  images,
  lowPriceEur,
  highPriceEur,
  sku,
}: ProductSchemaInput): JsonLdObject {
  const url = absoluteUrl(path);
  const hasPrice = typeof lowPriceEur === "number" && lowPriceEur > 0;

  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name,
    description,
    url,
    ...(images.length > 0 ? { image: images } : {}),
    ...(sku ? { sku } : {}),
    brand: { "@type": "Brand", name: SITE_NAME },
    ...(hasPrice
      ? {
          offers: {
            "@type": "AggregateOffer",
            priceCurrency: "EUR",
            lowPrice: lowPriceEur.toFixed(2),
            ...(typeof highPriceEur === "number" && highPriceEur > 0
              ? { highPrice: highPriceEur.toFixed(2) }
              : {}),
            availability: "https://schema.org/InStock",
            url,
            seller: { "@id": `${getSiteBaseUrl()}/#organization` },
          },
        }
      : {}),
  };
}

export type ItemListEntry = { name: string; path: string };

export function itemListSchema(items: ItemListEntry[]): JsonLdObject {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.path),
    })),
  };
}
