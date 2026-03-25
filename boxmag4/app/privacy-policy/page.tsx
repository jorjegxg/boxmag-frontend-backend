"use client";

import React from "react";
import Link from "next/link";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaShieldAlt } from "react-icons/fa";
import { useLanguage } from "../i18n/language-context";

function PolicySection({
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

export default function PrivacyPolicyPage() {
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
          <span className="text-gray-700 font-semibold">{t("privacyPolicy.title")}</span>
        </div>
      </section>

      {/* Main title: PRIVACY POLICY */}
      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaShieldAlt className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            {t("privacyPolicy.title")}
          </h1>
        </div>
      </section>

      {/* Content */}
      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        <div className="max-w-4xl mx-auto">
          <PolicySection title={t("privacyPolicy.basic.title")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                {t("privacyPolicy.basic.item1")}
              </li>
              <li>
                {t("privacyPolicy.basic.item2.beforeEmail")}{" "}
                <a
                  href="mailto:info@boxmag.eu"
                  className="text-my-red underline hover:no-underline"
                >
                  info@boxmag.eu
                </a>
                {t("privacyPolicy.basic.item2.afterEmail")}
              </li>
              <li>
                {t("privacyPolicy.basic.item3")}
              </li>
            </ol>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.individuals.title")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                {t("privacyPolicy.individuals.item1.beforeUrl")}{" "}
                <a
                  href="https://boxmag.eu/en/"
                  className="text-my-red underline hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  https://boxmag.eu/en/
                </a>
                {t("privacyPolicy.individuals.item1.afterUrl")}
              </li>
              <li>
                {t("privacyPolicy.individuals.item2.intro")}
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>{t("privacyPolicy.individuals.item2.bullets.1")}</li>
                  <li>{t("privacyPolicy.individuals.item2.bullets.2")}</li>
                  <li>{t("privacyPolicy.individuals.item2.bullets.3")}</li>
                  <li>{t("privacyPolicy.individuals.item2.bullets.4")}</li>
                  <li>{t("privacyPolicy.individuals.item2.bullets.5")}</li>
                  <li>{t("privacyPolicy.individuals.item2.bullets.6")}</li>
                </ul>
              </li>
              <li>
                {t("privacyPolicy.individuals.item3.intro")}
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>{t("privacyPolicy.individuals.item3.fields.1")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.2")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.3")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.4")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.5")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.6")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.7")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.8")}</li>
                  <li>{t("privacyPolicy.individuals.item3.fields.9")}</li>
                </ul>
              </li>
            </ol>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.purposes.title")}>
            <p>
              {t("privacyPolicy.purposes.p1.beforeBoxmag")}{" "}
              <a
                href="https://www.boxmag.eu"
                className="text-my-red underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.boxmag.eu
              </a>{" "}
              {t("privacyPolicy.purposes.p1.between")}{" "}
              <a
                href="https://www.rekopackaging.com"
                className="text-my-red underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                www.rekopackaging.com
              </a>
              {t("privacyPolicy.purposes.p1.afterReko")}
            </p>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.recipients.title")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                {t("privacyPolicy.recipients.item1.intro")}
                <ul className="list-disc list-inside ml-4 mt-2 space-y-1">
                  <li>{t("privacyPolicy.recipients.item1.bullets.1")}</li>
                  <li>{t("privacyPolicy.recipients.item1.bullets.2")}</li>
                  <li>{t("privacyPolicy.recipients.item1.bullets.3")}</li>
                  <li>{t("privacyPolicy.recipients.item1.bullets.4")}</li>
                  <li>{t("privacyPolicy.recipients.item1.bullets.5")}</li>
                  <li>{t("privacyPolicy.recipients.item1.bullets.6")}</li>
                  <li>{t("privacyPolicy.recipients.item1.bullets.7")}</li>
                </ul>
              </li>
              <li>
                {t("privacyPolicy.recipients.item2.beforeEmail")}{" "}
                <a
                  href="mailto:info@boxmag.eu"
                  className="text-my-red underline hover:no-underline"
                >
                  info@boxmag.eu
                </a>
                {t("privacyPolicy.recipients.item2.afterEmail")}
              </li>
            </ol>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.rights.title")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                {t("privacyPolicy.rights.item1.intro")}
                <ul className="list-disc list-inside ml-4 mt-2 space-y-2">
                  <li>
                    <strong>{t("privacyPolicy.rights.access.label")}</strong>{" "}
                    - {t("privacyPolicy.rights.access.desc")}
                  </li>
                  <li>
                    <strong>{t("privacyPolicy.rights.rectification.label")}</strong>{" "}
                    - {t("privacyPolicy.rights.rectification.desc")}
                  </li>
                  <li>
                    <strong>{t("privacyPolicy.rights.erasure.label")}</strong>{" "}
                    {t("privacyPolicy.rights.erasure.note")} -{" "}
                    {t("privacyPolicy.rights.erasure.desc")}
                  </li>
                  <li>
                    <strong>{t("privacyPolicy.rights.restriction.label")}</strong>{" "}
                    - {t("privacyPolicy.rights.restriction.desc")}
                  </li>
                  <li>
                    <strong>{t("privacyPolicy.rights.portability.label")}</strong>{" "}
                    - {t("privacyPolicy.rights.portability.desc")}
                  </li>
                </ul>
              </li>
              <li>
                {t("privacyPolicy.rights.item2")}
              </li>
              <li>
                {t("privacyPolicy.rights.item3")}
              </li>
              <li>
                {t("privacyPolicy.rights.item4")}
              </li>
            </ol>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.security.title")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>{t("privacyPolicy.security.item1")}</li>
              <li>{t("privacyPolicy.security.item2")}</li>
              <li>{t("privacyPolicy.security.item3")}</li>
              <li>{t("privacyPolicy.security.item4")}</li>
            </ol>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.mandatory.title")}>
            <p>{t("privacyPolicy.mandatory.p1")}</p>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.thirdCountries.title")}>
            <p>{t("privacyPolicy.thirdCountries.p1")}</p>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.cookies.what.title")}>
            <p>{t("privacyPolicy.cookies.what.p1")}</p>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.cookies.purpose.title")}>
            <p>{t("privacyPolicy.cookies.purpose.p1")}</p>
            <p>
              {t("privacyPolicy.cookies.purpose.p2.beforeUrl")}{" "}
              <a
                href="https://www.boxmag.eu/en/"
                className="text-my-red underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.boxmag.eu/en/
              </a>{" "}
              {t("privacyPolicy.cookies.purpose.p2.afterUrl")}
            </p>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.cookies.types.title")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                <strong>{t("privacyPolicy.cookies.types.essential.label")}</strong>{" "}
                – {t("privacyPolicy.cookies.types.essential.desc")}
              </li>
              <li>
                <strong>{t("privacyPolicy.cookies.types.statistical.label")}</strong>{" "}
                – {t("privacyPolicy.cookies.types.statistical.desc")}
              </li>
              <li>
                <strong>{t("privacyPolicy.cookies.types.preference.label")}</strong>{" "}
                – {t("privacyPolicy.cookies.types.preference.desc")}
              </li>
              <li>
                <strong>{t("privacyPolicy.cookies.types.marketing.label")}</strong>{" "}
                – {t("privacyPolicy.cookies.types.marketing.desc")}
              </li>
            </ol>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.cookies.management.title")}>
            <p>
              {t("privacyPolicy.cookies.management.p1.beforeUrl")}{" "}
              <a
                href="https://www.boxmag.eu/en/"
                className="text-my-red underline hover:no-underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                https://www.boxmag.eu/en/
              </a>
              {t("privacyPolicy.cookies.management.p1.afterUrl")}
            </p>
          </PolicySection>

          {/* Cookie Policy – full-width header bar (sharp corners, left-aligned) */}
          <section className="w-full mb-8">
            <div className="bg-my-red rounded-none w-full px-6 sm:px-8 py-4 text-left">
              <h2 className="text-white font-bold text-lg sm:text-xl">
                {t("privacyPolicy.cookiePolicy.title")}
              </h2>
            </div>
            <div className="rounded-b-lg border-2 border-t-0 border-gray-200 bg-white px-6 py-5 sm:px-8 sm:py-6 text-gray-800 text-sm sm:text-base leading-relaxed space-y-4">
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>{t("privacyPolicy.cookiePolicy.bullets.1")}</li>
                <li>{t("privacyPolicy.cookiePolicy.bullets.2")}</li>
                <li>{t("privacyPolicy.cookiePolicy.bullets.3")}</li>
                <li>{t("privacyPolicy.cookiePolicy.bullets.4")}</li>
              </ul>
              <p className="pt-2">{t("privacyPolicy.cookiePolicy.p1")}</p>
            </div>
          </section>

          <PolicySection title={t("privacyPolicy.disableComputer.title")}>
            <p>{t("privacyPolicy.disableComputer.intro")}</p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>{t("privacyPolicy.disableComputer.bullets.1")}</li>
              <li>{t("privacyPolicy.disableComputer.bullets.2")}</li>
              <li>{t("privacyPolicy.disableComputer.bullets.3")}</li>
            </ul>
            <p className="pt-2">{t("privacyPolicy.disableComputer.note")}</p>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.disableMobile.title")}>
            <p>{t("privacyPolicy.disableMobile.p1")}</p>
          </PolicySection>

          <PolicySection title={t("privacyPolicy.tools.title")}>
            <ol className="list-decimal list-inside space-y-3">
              <li>
                <strong>{t("privacyPolicy.tools.analytics.label")}</strong>{" "}
                {t("privacyPolicy.tools.analytics.desc")}
              </li>
              <li>
                <strong>{t("privacyPolicy.tools.ads.label")}</strong>{" "}
                {t("privacyPolicy.tools.ads.desc")}
              </li>
              <li>
                <strong>{t("privacyPolicy.tools.facebook.label")}</strong>{" "}
                {t("privacyPolicy.tools.facebook.desc")}
              </li>
              <li>
                <strong>{t("privacyPolicy.tools.trusted.label")}</strong>{" "}
                {t("privacyPolicy.tools.trusted.beforeUrl")}{" "}
                <a
                  href="https://www.trusted.ro"
                  className="text-my-red underline hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  www.trusted.ro
                </a>
                {t("privacyPolicy.tools.trusted.afterUrl")}
              </li>
            </ol>
          </PolicySection>
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
