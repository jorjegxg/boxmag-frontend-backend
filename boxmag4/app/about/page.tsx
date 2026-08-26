import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import AboutClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "About Us — Corrugated Packaging Manufacturer",
  description: "Boxmag is the online shop of REKO PACKAGING, a corrugated packaging manufacturer in Radauti, Suceava, serving e-commerce and industrial clients.",
  path: "/about",
});

export default function AboutPage() {
  return <AboutClient />;
}
