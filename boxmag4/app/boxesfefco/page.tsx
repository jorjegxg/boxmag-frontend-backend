import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import BoxesFefcoClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "FEFCO Boxes — Ready-Made Shipping Solutions",
  description: "Boxmag's FEFCO box range: ready-made corrugated shipping boxes matched to common e-commerce product sizes.",
  path: "/boxesfefco",
});

export default function BoxesFefcoPage() {
  return <BoxesFefcoClient />;
}
