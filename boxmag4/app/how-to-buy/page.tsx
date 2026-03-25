"use client";

import React, { useState } from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaShoppingCart, FaCopy } from "react-icons/fa";
import { useLanguage } from "../i18n/language-context";

const SWIFT_CODE = "BTRLRO22";

export default function HowToBuyPage() {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  const copySwift = () => {
    navigator.clipboard.writeText(SWIFT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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
          <span className="text-gray-700 font-semibold">{t("howToBuy.title")}</span>
        </div>
      </section>

      {/* Main title: HOW TO BUY */}
      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaShoppingCart className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            {t("howToBuy.title")}
          </h1>
        </div>
      </section>

      {/* Content - single white block with numbered list + SWIFT */}
      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        <div className="max-w-4xl mx-auto rounded-lg border-2 border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8 text-gray-800 text-sm sm:text-base leading-relaxed">
          <ol className="list-decimal list-inside space-y-4">
            <li>{t("howToBuy.li1")}</li>
            <li>{t("howToBuy.li2")}</li>
            <li>
              {t("howToBuy.li3")}
              <ul className="mt-2 ml-4 list-disc list-inside space-y-1">
                <li>Tpay payments,</li>
                <li>VISA/Mastercard payments,</li>
                <li>Stripe payments,</li>
                <li>PayPal payments,</li>
                <li>Netopya payments – deferred payments, up to 90 days,</li>
                <li>bank transfer for orders in EUR: RO85 BTRL 0610 4202 4207 76XX</li>
                <li>bank transfer for orders in RON: RO39 BTRL 0610 1202 4207 76XX</li>
              </ul>
            </li>
            <li>{t("howToBuy.li4")}</li>
            <li>{t("howToBuy.li5")}</li>
          </ol>

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-gray-800 font-medium">{t("howToBuy.swift")}</span>
            <div className="inline-flex items-center gap-2 rounded-lg bg-my-yellow px-4 py-2">
              <span className="font-mono font-semibold text-gray-900">{SWIFT_CODE}</span>
              <button
                type="button"
                onClick={copySwift}
                className="p-1 rounded hover:bg-black/10 transition-colors"
                title={t("howToBuy.copyTitle")}
                aria-label={t("howToBuy.copyAria")}
              >
                <FaCopy className="w-4 h-4 text-gray-700" />
              </button>
            </div>
            {copied && <span className="text-sm text-green-600 font-medium">{t("howToBuy.copied")}</span>}
          </div>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
