import type { Metadata } from "next";
import { getSiteBaseUrl } from "./site-url";

/**
 * Shared metadata builder for public pages.
 *
 * Every public route is a Server Component wrapper whose only job is to export
 * `metadata` (or `generateMetadata`) built from here and render its client page.
 *
 * Note on i18n: the site serves EN/RO/DE from the same URLs via the
 * `boxmag.language` cookie (see `middleware.ts`), so there is no `hreflang` —
 * canonical always points at the single URL for the route.
 */

export const SITE_NAME = "Boxmag";

/** Google truncates around these lengths in the SERP. */
const TITLE_MAX = 60;
const DESCRIPTION_MAX = 160;

export type SeoInput = {
  /** Page title without the site suffix — the template appends "| Boxmag". */
  title: string;
  description: string;
  /** Route path starting with "/", without query string. */
  path: string;
  /** Absolute or root-relative image URL for Open Graph. */
  image?: string;
  type?: "website" | "article";
  /** Set for pages that should stay out of the index. */
  noIndex?: boolean;
};

export function absoluteUrl(path: string): string {
  const siteUrl = getSiteBaseUrl();
  if (!path || path === "/") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

function truncate(value: string, max: number): string {
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  const cut = trimmed.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
}

export function buildMetadata({
  title,
  description,
  path,
  image,
  type = "website",
  noIndex = false,
}: SeoInput): Metadata {
  const url = absoluteUrl(path);
  const safeTitle = truncate(title, TITLE_MAX);
  const safeDescription = truncate(description, DESCRIPTION_MAX);
  const images = image ? [{ url: image }] : undefined;

  return {
    title: safeTitle,
    description: safeDescription,
    alternates: { canonical: url },
    openGraph: {
      title: safeTitle,
      description: safeDescription,
      url,
      siteName: SITE_NAME,
      type,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: safeTitle,
      description: safeDescription,
      images: image ? [image] : undefined,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : {
          index: true,
          follow: true,
          googleBot: {
            index: true,
            follow: true,
            "max-image-preview": "large",
            "max-snippet": -1,
            "max-video-preview": -1,
          },
        },
  };
}
