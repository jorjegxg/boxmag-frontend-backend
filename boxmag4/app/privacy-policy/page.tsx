import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import PrivacyPolicyClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Boxmag collects, uses and protects your personal data, in line with GDPR.",
  path: "/privacy-policy",
});

export default function PrivacyPolicyPage() {
  return <PrivacyPolicyClient />;
}
