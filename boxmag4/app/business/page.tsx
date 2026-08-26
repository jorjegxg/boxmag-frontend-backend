import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import BusinessClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Custom Boxes for Business — B2B Configurator",
  description: "Configure custom corrugated packaging for your business: dimensions, cardboard quality, print and quantity. Get a quote from the Boxmag B2B team.",
  path: "/business",
});

export default function BusinessPage() {
  return <BusinessClient />;
}
