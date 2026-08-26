import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import DeliveryClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Delivery of Goods — Shipping Times & Costs",
  description: "How Boxmag ships your corrugated boxes: delivery times, shipping methods, pallet deliveries and costs across Europe.",
  path: "/delivery",
});

export default function DeliveryPage() {
  return <DeliveryClient />;
}
