import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import { breadcrumbSchema } from "@/lib/schema";
import { JsonLd } from "../global/components/json-ld";
import ShopClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Shop Corrugated Boxes — Stock Sizes & Prices",
  description:
    "Browse Boxmag's catalogue of corrugated cardboard boxes. Internal dimensions, cardboard quality and tiered pricing from 100 pcs upwards.",
  path: "/shop",
});

export default function ShopPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbSchema([
          { name: "Home", path: "/" },
          { name: "Shop", path: "/shop" },
        ])}
      />
      <ShopClient />
    </>
  );
}
