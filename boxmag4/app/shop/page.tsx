"use client";

import { ProductsTable } from "../components/ProductTable";
import { B2b } from "../global/components/b2b";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { WhyChooseBoxfixSection } from "../global/components/why-choose-boxfix-section";
import Link from "next/link";
import Image from "next/image";
import { ServicesSection } from "../global/components/services-section";
import { TrainingProductVideoSection } from "../global/components/training-product-video-section";
import { useLanguage } from "../i18n/language-context";

export default function ShopPage() {
  const { t } = useLanguage();

  return (
    <div>
      <B2b />

      {/* Current page section */}
      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">{t("footer.shop")}</span>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">BoxFix</span>
        </div>
      </section>

      {/* Packaging for e-commerce section (no dots) */}
      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-[28px] border border-black/15 bg-white px-6 py-10 lg:px-12 lg:py-12">
            <h2 className="text-center text-3xl lg:text-5xl font-extrabold text-black uppercase tracking-wide">
              {t("shop.packaging")}
            </h2>

            <div className="mt-10 grid grid-cols-[1fr_1fr_1fr] lg:grid-cols-3 gap-6 lg:gap-10 items-center max-sm:hidden">
              {[
                {
                  src: "/b2b/boxes/sqashed.png",
                  alt: "Flattened box with tear strip",
                },
                {
                  src: "/b2b/boxes/open-box.png",
                  alt: "Open e-commerce shipping box",
                },
                {
                  src: "/b2b/boxes/box.png",
                  alt: "Closed shipping box",
                },
              ].map(({ src, alt }, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center rounded-2xl bg-white"
                >
                  <div className="w-full max-w-[260px] aspect-4/3 flex items-center justify-center">
                    <Image
                      src={src}
                      alt={alt}
                      width={420}
                      height={320}
                      className="w-full h-full object-contain"
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <p className="text-my-red text-xl lg:text-2xl font-extrabold">
                BOXFIX<sup className="align-top text-sm lg:text-base">®</sup>{" "}
                <span className="font-semibold text-my-red">
                  {t("shop.slogan")}
                </span>
              </p>
              <p className="mt-5 text-gray-700 max-w-4xl mx-auto leading-relaxed text-sm lg:text-base">
                {t("shop.boxfixDescription")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Discover section */}
      <section className="w-full bg-[#f36a45] mt-10">
        <div className="max-w-7xl mx-auto px-6 lg:px-20 py-6">
          <p className="text-center text-white font-bold uppercase leading-tight text-lg lg:text-2xl">
            {t("shop.discoverLine1")}
            <br />
            {t("shop.discoverLine2")}
          </p>
        </div>
      </section>

      {/* BoxFix Products section */}
      <section className="w-full px-4 py-10 sm:px-6 lg:px-20">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-xl font-bold text-black sm:text-2xl mb-6 pb-3 border-b border-black/10">
            {t("shop.products")}
          </h1>
          <div className="-mx-4 sm:mx-0 min-w-0">
            <ProductsTable />
          </div>
        </div>{" "}
      </section>
      <div className="pt-16"></div>
      <WhyChooseBoxfixSection />
      {/* <TrainingProductVideoSection /> */}
      <HaveAQuestion />
      <ServicesSection />
      <NewsletterSubscribe />
    </div>
  );
}
