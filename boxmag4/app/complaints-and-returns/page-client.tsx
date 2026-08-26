"use client";

import React from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaCommentDots } from "react-icons/fa";
import { useLanguage } from "../i18n/language-context";

function ComplaintsSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="w-full mb-8">
      <div className="bg-my-red rounded-t-lg px-4 py-3 sm:px-6 sm:py-4">
        <h2 className="text-white font-bold text-base sm:text-lg">{title}</h2>
      </div>
      <div className="rounded-b-lg border-2 border-t-0 border-gray-200 bg-white px-6 py-5 sm:px-8 sm:py-6 text-gray-800 text-sm sm:text-base leading-relaxed space-y-4">
        {children}
      </div>
    </section>
  );
}

export default function ComplaintsAndReturnsPage() {
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
          <span className="text-gray-700 font-semibold">{t("complaints.title")}</span>
        </div>
      </section>

      {/* Main title: COMPLAINTS AND RETURNS */}
      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaCommentDots className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            {t("complaints.title")}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        <div className="max-w-4xl mx-auto">
          <ComplaintsSection title={t("complaints.sections.withdrawal.title")}>
            <p>{t("reg.withdrawalP1")}</p>
            <p>{t("reg.withdrawalP2")}</p>
            <p>{t("reg.withdrawalP3")}</p>
          </ComplaintsSection>

          <ComplaintsSection title={t("complaints.sections.withdrawalConsequences.title")}>
            <p>{t("reg.wConsP1")}</p>
            <p>{t("reg.wConsP2")}</p>
            <p>
              <strong>{t("reg.wConsExcludeTitle")}</strong>
            </p>
            <ul className="list-disc list-inside ml-2">
              <li>{t("reg.wConsExcludeItem")}</li>
            </ul>
          </ComplaintsSection>

          <ComplaintsSection title={t("complaints.sections.modelForm.title")}>
            <p className="text-gray-600 italic">{t("reg.mfIntro")}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t("reg.mfAddressee")}</li>
              <li>{t("reg.mfInform")}</li>
              <li>{t("reg.mfDate")}</li>
              <li>{t("reg.mfConsumerName")}</li>
              <li>{t("reg.mfConsumerAddr")}</li>
              <li>{t("reg.mfConsumerSig")}</li>
            </ul>
          </ComplaintsSection>

          <ComplaintsSection title={t("complaints.sections.goodsComplaints.title")}>
            <p>{t("reg.compGoodsP1")}</p>
            <p>
              <strong>{t("reg.compSubmitTitle")}</strong>
            </p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>{t("reg.compInWriting")}</li>
              <li>{t("reg.compViaEmail")}</li>
            </ul>
            <p>{t("reg.compGoodsP2")}</p>
            <p>
              <strong>{t("reg.compRecTitle")}</strong> {t("reg.compRecBody")}
            </p>
          </ComplaintsSection>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
