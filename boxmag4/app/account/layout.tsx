import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

// The account pages are client components, so their metadata lives here.
export const metadata: Metadata = buildMetadata({
  title: "My Account",
  description: "Your Boxmag profile, saved addresses and order history.",
  path: "/account",
  noIndex: true,
});

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
