"use client";

import React from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaTruck } from "react-icons/fa";
import { useLanguage } from "../i18n/language-context";

export default function DeliveryPage() {
  const { t } = useLanguage();

  return (
    <div>
      <B2b />

      {/* Breadcrumb */}
      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-4xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">{t("delivery.title")}</span>
        </div>
      </section>

      {/* Main title: DELIVERY OF GOODS */}
      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaTruck className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            {t("delivery.title")}
          </h1>
        </div>
      </section>

      {/* Content - single white block with numbered list 1-7 */}
      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        <div className="max-w-4xl mx-auto rounded-lg border-2 border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8 text-gray-800 text-sm sm:text-base leading-relaxed">
          <ol className="list-decimal list-inside space-y-4">
            <li>{t("delivery.i1")}</li>
            <li>{t("delivery.i2")}</li>
            <li>{t("delivery.i3")}</li>
            <li>{t("delivery.i4")}</li>
            <li>
              {t("delivery.i5")}
              <ul className="mt-2 ml-4 list-disc list-inside space-y-1">
                <li>{t("delivery.i5a")}</li>
                <li>{t("delivery.i5b")}</li>
              </ul>
            </li>
            <li>
              {t("delivery.i6")}
              <p className="mt-2 font-semibold">{t("delivery.warehouse")}</p>
              <p className="font-semibold">Boxmag, Stefan cel Mare 131 street</p>
              <p className="font-semibold">RO-725400 Radauti, Suceava</p>
            </li>
            <li>{t("delivery.i7")}</li>
          </ol>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
