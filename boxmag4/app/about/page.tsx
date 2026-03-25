"use client";

import { B2b } from "../global/components/b2b";
import Image from "next/image";
import Link from "next/link";
import { FaQuoteLeft, FaQuoteRight } from "react-icons/fa";
import { FeaturesSection } from "../global/components/features-section";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { useLanguage } from "../i18n/language-context";

export default function AboutPage() {
  const { t } = useLanguage();

  return (
    <div className="">
      <B2b />
      {/* Breadcrumb */}
      <section className="w-full bg-white px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">{t("about.aboutUs")}</span>
        </div>
      </section>

      {/* About Us: text and picture in one bordered container */}
      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white px-6 py-10 lg:px-12 lg:py-12">
          <h1 className="text-center text-3xl lg:text-5xl font-extrabold text-my-red uppercase tracking-wide mb-8">
            {t("about.aboutUs")}
          </h1>
          <div className="max-w-3xl mx-auto space-y-6 text-gray-800 text-base lg:text-lg leading-relaxed text-justify">
            <p>{t("about.aboutP1")}</p>
            <p>
              {t("about.aboutP2")}
            </p>
          </div>
          <div className="relative w-full aspect-16/10 lg:aspect-21/9 rounded-2xl overflow-hidden bg-gray-100 mt-10">
            <Image
              src="/pictures/factory.jpg"
              alt="BOXMAG production line – cardboard packaging manufacturing"
              fill
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 1280px"
              priority
            />
          </div>
        </div>
      </section>

      {/* Section 1: Quality quote – two columns (text | image) */}
      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 overflow-hidden">
          <div className="bg-my-red py-4 px-6 text-center">
            <p className="text-white font-medium text-lg lg:text-xl">
              {t("about.qualityTitle")}
            </p>
          </div>
          <div className="flex flex-col lg:flex-row min-h-[280px]">
            <div className="flex-1 bg-my-light-gray2 p-8 lg:p-10 relative">
              <FaQuoteLeft className="absolute top-6 left-6 w-10 h-10 text-my-red opacity-90" />
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-800 text-base lg:text-lg leading-relaxed pt-4 max-w-xl">
                  {t("about.qualityText")}
                </p>
              </div>
              <FaQuoteRight className="absolute bottom-6 right-6 w-10 h-10 text-my-red opacity-90" />
            </div>
            <div className="w-full lg:w-[40%] min-h-[240px] bg-my-yellow flex items-center justify-center p-6 relative">
              <Image
                src="/b2b/boxes/ecommerce.png"
                alt="E-commerce cardboard boxes"
                width={320}
                height={240}
                className="object-contain max-h-64 w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: BOXFIX® sending boxes – teal block + second picture */}
      <section className="w-full bg-white px-6 lg:px-20 pb-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 overflow-hidden bg-teal-600">
          <div className="p-8 lg:p-12 text-center">
            <h2 className="text-xl lg:text-2xl font-bold text-white mb-4 uppercase tracking-wide">
              {t("about.discoverTitle")}
            </h2>
            <p className="text-white/95 text-base lg:text-lg max-w-3xl mx-auto mb-8 leading-relaxed">
              {t("about.discoverText")}
            </p>
            <div className="flex flex-wrap justify-center items-end gap-6 lg:gap-10">
              <Image
                src="/b2b/boxes/adjustable.png"
                alt="BOXFIX box flattened"
                width={180}
                height={140}
                className="object-contain max-h-40 w-auto"
              />
              <Image
                src="/b2b/boxes/ecommerce.png"
                alt="BOXFIX box open"
                width={180}
                height={140}
                className="object-contain max-h-40 w-auto"
              />
              <Image
                src="/b2b/boxes/felco.png"
                alt="BOXFIX box closed"
                width={180}
                height={140}
                className="object-contain max-h-40 w-auto"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Company Data */}
      <section className="w-full bg-white px-6 lg:px-20 py-8 relative overflow-hidden">
        {/* Background SVGs – bigger, half visible */}
        <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
          <Image
            src="/svgs/building-icon.svg"
            alt=""
            width={400}
            height={640}
            className="absolute left-0 bottom-0 w-72 lg:w-96 h-auto opacity-[0.12] -translate-x-1/2"
            aria-hidden
          />
          <Image
            src="/svgs/bank-building-icon.svg"
            alt=""
            width={400}
            height={640}
            className="absolute right-0 bottom-0 w-72 lg:w-96 h-auto opacity-[0.12] translate-x-1/2"
            aria-hidden
          />
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="relative z-10">
            <h2 className="text-center text-2xl lg:text-3xl font-bold text-my-red uppercase tracking-wide mb-8">
              {t("about.companyData")}
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <div className="rounded-2xl border-2 border-my-red p-6 lg:p-8 bg-white">
                <p className="font-bold text-black mb-2">Boxmag.eu</p>
                <p className="text-gray-800">Stefan cel Mare 131 street</p>
                <p className="text-gray-800">RO-725400 Radauti, Suceava</p>
                <p className="mt-3 font-bold text-black">Tel:</p>
                <p className="text-gray-800">+40 799 553 345</p>
                <p className="mt-2 font-bold text-black">Mail:</p>
                <p className="text-gray-800">info@boxmag.eu</p>
              </div>
              <div className="rounded-2xl border-2 border-my-red p-6 lg:p-8 bg-white">
                <p className="font-bold text-black mb-2">Boxmag.eu</p>
                <p className="font-bold text-black mb-2">{t("about.officeTitle")}</p>
                <p className="text-gray-800">Reko Packaging s.r.l.</p>
                <p className="text-gray-800">Stefan cel Mare 131 street</p>
                <p className="text-gray-800">RO-725400 Radauti, Suceava</p>
                <p className="text-gray-800">Com.Chambre Nr. J33/1437/1993</p>
                <p className="mt-3 font-bold text-black">VAT :</p>
                <p className="text-gray-800">RO4534966</p>
              </div>
            </div>

            <div className="rounded-2xl border-2 border-my-red p-6 lg:p-8 bg-white">
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-center gap-4 sm:gap-6">
                <div className="flex items-center gap-3">
                  <Image
                    src="/svgs/logo/boxmag_logo.svg"
                    alt="BOXMAG"
                    width={80}
                    height={40}
                    className="w-28  lg:w-32 object-contain"
                  />
                </div>
                <span className="text-gray-800">{t("about.isPartOf")}</span>
                <div className="flex items-center gap-2">
                  <Image
                    src="/svgs/logo/logo_with_registered_mark.svg"
                    alt="REKO PACKAGING"
                    width={140}
                    height={48}
                    className="h-10 lg:h-12 w-auto object-contain"
                  />
                </div>
              </div>
              <div className="text-center mt-6">
                <p className="text-my-red uppercase tracking-wide text-sm font-medium mb-1">
                  {t("about.visitMore")}
                </p>
                <a
                  href="https://www.rekopackaging.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-800 hover:underline"
                >
                  www.rekopackaging.com
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
