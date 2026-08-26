import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import HowToBuyClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "How to Buy — Ordering Guide",
  description: "Step-by-step guide to ordering corrugated boxes from Boxmag: choosing a size, minimum quantities, price tiers, payment and delivery.",
  path: "/how-to-buy",
});

export default function HowToBuyPage() {
  return <HowToBuyClient />;
}
