"use client";

import React from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaClipboardList } from "react-icons/fa";
import { useLanguage } from "../i18n/language-context";

function RegSection({
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

export default function RegulationsPage() {
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
          <span className="text-gray-700 font-semibold">{t("reg.title")}</span>
        </div>
      </section>

      {/* Main title: REGULATIONS */}
      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaClipboardList className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            {t("reg.title")}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        <div className="max-w-4xl mx-auto">
          <RegSection title={t("reg.definitionsTitle")}>
            <p className="mb-4">{t("reg.introDefs")}</p>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                <strong>{t("reg.defCustomer")}</strong> – {t("reg.defCustomerDesc")}
              </li>
              <li>
                <strong>{t("reg.defConsumer")}</strong> – {t("reg.defConsumerDesc")}
              </li>
              <li>
                <strong>{t("reg.defCivilCode")}</strong> – {t("reg.defCivilCodeDesc")}
              </li>
              <li>
                <strong>{t("reg.defRegulations")}</strong> – {t("reg.defRegulationsDesc")}
              </li>
              <li>
                <strong>{t("reg.defOnlineStore")}</strong> – {t("reg.defOnlineStoreDesc")}
              </li>
              <li>
                <strong>{t("reg.defGoods")}</strong> – {t("reg.defGoodsDesc")}
              </li>
              <li>
                <strong>{t("reg.defSalesAgreement")}</strong> – {t("reg.defSalesAgreementDesc")}
              </li>
              <li>
                <strong>{t("reg.defConsumerRightsAct")}</strong> – {t("reg.defConsumerRightsActDesc")}
              </li>
              <li>
                <strong>{t("reg.defActElectronic")}</strong> – {t("reg.defActElectronicDesc")}
              </li>
              <li>
                <strong>{t("reg.defOrder")}</strong> – {t("reg.defOrderDesc")}
              </li>
            </ol>
          </RegSection>

          <RegSection title={t("reg.generalTitle")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>{t("reg.gen1")}</li>
              <li>{t("reg.gen2")}</li>
              <li>{t("reg.gen3")}</li>
              <li>
                {t("reg.gen4")}
              </li>
              <li>{t("reg.gen5")}</li>
              <li>{t("reg.gen6")}</li>
            </ol>
          </RegSection>

          <RegSection title={t("reg.rulesTitle")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                <strong>{t("reg.rulesRegTitle")}</strong> {t("reg.rulesRegBody")}
              </li>
              <li>{t("reg.rulesSecurity")}</li>
              <li>
                <strong>{t("reg.rulesObligTitle")}</strong> {t("reg.rulesObligBody")}
              </li>
              <li>{t("reg.rulesInvoices")}</li>
            </ol>
          </RegSection>

          <RegSection title={t("reg.procedureTitle")}>
            <ol className="list-decimal list-inside space-y-3">
              <li><strong>{t("reg.procSelTitle")}</strong> {t("reg.procSelBody")}</li>
              <li><strong>{t("reg.procBasketTitle")}</strong> {t("reg.procBasketBody")}</li>
              <li><strong>{t("reg.procModTitle")}</strong> {t("reg.procModBody")}</li>
              <li><strong>{t("reg.procSumTitle")}</strong> {t("reg.procSumBody")}</li>
              <li><strong>{t("reg.procConfTitle")}</strong> {t("reg.procConfBody")}</li>
              <li><strong>{t("reg.procConcTitle")}</strong> {t("reg.procConcBody")}</li>
              <li>{t("reg.procAccess")}</li>
            </ol>
          </RegSection>

          <RegSection title={t("reg.deliveryTitle")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>{t("reg.deliv1")} <a href="https://boxmag.eu/en/content/delivery" className="text-my-red underline hover:no-underline" target="_blank" rel="noopener noreferrer">https://boxmag.eu/en/content/delivery</a>.</li>
              <li>{t("reg.deliv2")}</li>
              <li>{t("reg.deliv3")}</li>
              <li>{t("reg.deliv4")}</li>
              <li>{t("reg.deliv5")}</li>
              <li>{t("reg.deliv6")}</li>
              <li>{t("reg.deliv7")}</li>
              <li>{t("reg.deliv8")}</li>
              <li>{t("reg.deliv9")}</li>
            </ol>
          </RegSection>

          <RegSection title={t("reg.pricesTitle")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>{t("reg.prices1")}</li>
              <li>{t("reg.prices2")}</li>
              <li>{t("reg.prices3")} <a href="https://boxmag.eu/en/content/how-to-buy" className="text-my-red underline hover:no-underline" target="_blank" rel="noopener noreferrer">https://boxmag.eu/en/content/how-to-buy</a>.</li>
              <li>{t("reg.prices4")}</li>
              <li>{t("reg.prices5")}</li>
            </ol>
          </RegSection>

          <RegSection title={t("reg.withdrawalTitle")}>
            <p>{t("reg.withdrawalP1")}</p>
            <p>{t("reg.withdrawalP2")}</p>
            <p>{t("reg.withdrawalP3")}</p>
          </RegSection>

          <RegSection title={t("reg.withdrawalConsTitle")}>
            <p>{t("reg.wConsP1")}</p>
            <p>{t("reg.wConsP2")}</p>
            <p><strong>{t("reg.wConsExcludeTitle")}</strong></p>
            <ul className="list-disc list-inside ml-2">
              <li>{t("reg.wConsExcludeItem")}</li>
            </ul>
          </RegSection>

          <RegSection title={t("reg.modelFormTitle")}>
            <p className="text-gray-600 italic">{t("reg.mfIntro")}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t("reg.mfAddressee")}</li>
              <li>{t("reg.mfInform")}</li>
              <li>{t("reg.mfDate")}</li>
              <li>{t("reg.mfConsumerName")}</li>
              <li>{t("reg.mfConsumerAddr")}</li>
              <li>{t("reg.mfConsumerSig")}</li>
            </ul>
          </RegSection>

          <RegSection title={t("reg.complaintsGoodsTitle")}>
            <p>{t("reg.compGoodsP1")}</p>
            <p><strong>{t("reg.compSubmitTitle")}</strong></p>
            <ul className="list-disc list-inside ml-2 space-y-1">
              <li>{t("reg.compInWriting")}</li>
              <li>{t("reg.compViaEmail")}</li>
            </ul>
            <p>{t("reg.compGoodsP2")}</p>
            <p><strong>{t("reg.compRecTitle")}</strong> {t("reg.compRecBody")}</p>
          </RegSection>

          <RegSection title={t("reg.extraGuaranteesTitle")}>
            <p>{t("reg.extraGuarP1")}</p>
          </RegSection>

          <RegSection title={t("reg.eServicesTitle")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>{t("reg.eSvc1")}</li>
              <li>{t("reg.eSvc2")}</li>
              <li>{t("reg.eSvc3")}</li>
              <li>{t("reg.eSvc4")}</li>
            </ol>
          </RegSection>

          <RegSection title={t("reg.outOfCourtTitle")}>
            <p>{t("reg.outOfCourtP1")} <a href="https://ec.europa.eu/consumers/odr" className="text-my-red underline hover:no-underline" target="_blank" rel="noopener noreferrer">https://ec.europa.eu/consumers/odr</a>.</p>
          </RegSection>

          <RegSection title={t("reg.finalTitle")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>{t("reg.final1")}</li>
              <li>{t("reg.final2")}</li>
            </ol>
          </RegSection>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
