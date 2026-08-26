import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import ComplaintsAndReturnsClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Complaints & Returns",
  description: "How to file a complaint or return an order placed with Boxmag, including deadlines and the required information.",
  path: "/complaints-and-returns",
});

export default function ComplaintsAndReturnsPage() {
  return <ComplaintsAndReturnsClient />;
}
