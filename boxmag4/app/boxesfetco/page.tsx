import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import BoxesFetcoClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Boxes for FETCO — Ready-Made Shipping Solutions",
  description: "Boxmag's FETCO box range: ready-made corrugated shipping boxes matched to common e-commerce product sizes.",
  path: "/boxesfetco",
});

export default function BoxesFetcoPage() {
  return <BoxesFetcoClient />;
}
