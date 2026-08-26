import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import CorrugatedEnvelopesClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Corrugated Cardboard Envelopes",
  description: "Protective corrugated cardboard envelopes for books, documents and flat products. Rigid, lightweight and ready for e-commerce shipping.",
  path: "/corrugated-envelopes",
});

export default function CorrugatedEnvelopesPage() {
  return <CorrugatedEnvelopesClient />;
}
