import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import HomeClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Corrugated Cardboard Boxes — Manufacturer & Online Shop",
  description: "Boxmag manufactures and ships e-commerce corrugated boxes in stock sizes, plus custom B2B orders. Order from 100 pcs with delivery across Europe.",
  path: "/",
});

export default function HomePage() {
  return <HomeClient />;
}
