import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// The checkout pages are client components, so their metadata lives here.
export const metadata: Metadata = buildMetadata({
  title: "Checkout",
  description: "Review your cart, enter delivery details and pay securely.",
  path: "/checkout",
  noIndex: true,
});

export default function CheckoutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
