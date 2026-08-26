import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";
import ContactClient from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Contact Us — Sales & Support",
  description: "Get in touch with the Boxmag team for orders, custom packaging quotes and support. Phone, email and our Radauti, Suceava address.",
  path: "/contact",
});

export default function ContactPage() {
  return <ContactClient />;
}
