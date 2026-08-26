import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import RegulationsClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Terms & Regulations",
  description: "The terms and conditions that apply to orders placed through the Boxmag online shop.",
  path: "/regulations",
});

export default function RegulationsPage() {
  return <RegulationsClient />;
}
