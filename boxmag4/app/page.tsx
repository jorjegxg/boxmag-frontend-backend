import type { Metadata } from "next";
import { cookies } from "next/headers";
import { buildMetadata } from "@/lib/seo";
import { getServerLanguage } from "@/lib/i18n-server";
import { HomeHeroSection } from "./home/hero-section";
import HomeBelowFold from "./page-client";

export const metadata: Metadata = buildMetadata({
  title: "Corrugated Cardboard Boxes — Manufacturer & Online Shop",
  description:
    "Boxmag manufactures and ships e-commerce corrugated boxes in stock sizes, plus custom B2B orders. Order from 100 pcs with delivery across Europe.",
  path: "/",
});

export default async function HomePage() {
  const cookieStore = await cookies();
  const language = getServerLanguage(
    cookieStore.get("boxmag.language")?.value,
  );

  return (
    <>
      <HomeHeroSection language={language} />
      <HomeBelowFold />
    </>
  );
}
