import type { MetadataRoute } from "next";
import { getSiteBaseUrl } from "@/lib/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteBaseUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin/",
        "/checkout/",
        "/account/",
        "/order-summary",
        "/registration",
        "/verify-email",
        "/mobile-app-svg",
      ],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
