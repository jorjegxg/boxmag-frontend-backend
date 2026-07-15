"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { FaCheckCircle, FaUserPlus } from "react-icons/fa";
import { B2b } from "../../global/components/b2b";
import ResponsiveLayoutWithPadding from "../../ResponsiveLayoutWithPadding";
import { Bar } from "../components/Bar";
import { B2bProfessionalsSection } from "../components/B2bProfessionalsSection";
import { ServicesSection } from "../../global/components/services-section";
import { HaveAQuestion } from "../../global/components/have-a-question";
import { NewsletterSubscribe } from "../../global/components/newsletter-subscribe";
import { useLanguage } from "../../i18n/language-context";
import {
  buildRegistrationUrlFromOrderSuccess,
  clearB2bOrderSuccessPayload,
  readB2bOrderSuccessPayload,
  type B2bOrderSuccessPayload,
} from "../../../lib/b2b-order-success";
import useBusinessStore from "../store/business_store";
import useBusinessOrderStore from "../../stores/business_order_store";

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      <span>{text}</span>
    </li>
  );
}

export default function B2bOrderSuccessPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const resetSelections = useBusinessStore((s) => s.resetSelections);
  const resetDraft = useBusinessOrderStore((s) => s.resetDraft);
  const [orderData, setOrderData] = useState<B2bOrderSuccessPayload | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const payload = readB2bOrderSuccessPayload();
    if (!payload) {
      router.replace("/business");
      return;
    }
    resetSelections();
    resetDraft();
    setOrderData(payload);
    setIsReady(true);
  }, [router, resetDraft, resetSelections]);

  const handleSkip = () => {
    clearB2bOrderSuccessPayload();
    router.push("/");
  };

  if (!isReady || !orderData) {
    return null;
  }

  const registrationUrl = buildRegistrationUrlFromOrderSuccess(orderData);

  return (
    <div>
      <B2b />

      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <Link href="/business" className="hover:underline">
            {t("common.b2b")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">{t("b2bOrderSuccess.title")}</span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        <Bar />

        <div className="pt-8 md:pt-12 lg:pt-16" />

        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-10 sm:px-10 sm:py-12 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
              <FaCheckCircle className="h-8 w-8 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-black sm:text-3xl">
              {t("b2bOrderSuccess.title")}
            </h1>
            <p className="mt-3 text-sm text-gray-600 sm:text-base">
              {t("b2bOrderSuccess.subtitle")}
            </p>

            <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-left text-sm">
              <div className="flex justify-between border-b border-gray-200 py-1.5">
                <span className="font-semibold text-gray-700">
                  {t("b2bOrderSuccess.orderNumber")}
                </span>
                <span className="font-mono font-semibold text-my-red">
                  {orderData.orderNumber}
                </span>
              </div>
              <p className="mt-3 text-xs text-gray-500 sm:text-sm">
                {t("b2bOrderSuccess.emailSent")}{" "}
                <span className="font-medium text-gray-800">{orderData.email}</span>.
              </p>
            </div>

            {!orderData.isGuest ? (
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/account#orders"
                  onClick={() => clearB2bOrderSuccessPayload()}
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                >
                  {t("b2bOrderSuccess.viewOrders")}
                </Link>
                <Link
                  href="/"
                  onClick={() => clearB2bOrderSuccessPayload()}
                  className="inline-flex items-center justify-center rounded-lg border-2 border-my-red px-5 py-2.5 text-sm font-semibold text-my-red transition-colors hover:bg-my-red/10"
                >
                  {t("b2bOrderSuccess.continueBrowsing")}
                </Link>
              </div>
            ) : null}
          </div>

          {orderData.isGuest ? (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 sm:px-8">
                <div className="flex items-center gap-3">
                  <FaUserPlus className="h-7 w-7 text-my-red" />
                  <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                    {t("b2bOrderSuccess.createAccountTitle")}
                  </h2>
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-7">
                <ul className="space-y-2">
                  <BenefitItem text={t("b2bOrderSuccess.createAccountBenefit1")} />
                  <BenefitItem text={t("b2bOrderSuccess.createAccountBenefit2")} />
                  <BenefitItem text={t("b2bOrderSuccess.createAccountBenefit3")} />
                </ul>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href={registrationUrl}
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                  >
                    {t("b2bOrderSuccess.createAccountCta")}
                  </Link>
                  <button
                    type="button"
                    onClick={handleSkip}
                    className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {t("b2bOrderSuccess.skipCta")}
                  </button>
                </div>

                <p className="mt-5 text-sm text-gray-600">
                  {t("b2bOrderSuccess.alreadyHaveAccount")}{" "}
                  <Link
                    href="/account"
                    onClick={() => clearB2bOrderSuccessPayload()}
                    className="font-semibold text-my-red hover:underline"
                  >
                    {t("b2bOrderSuccess.signIn")}
                  </Link>
                </p>
              </div>
            </div>
          ) : null}
        </div>

        <div className="pt-8 md:pt-12 lg:pt-16" />
      </ResponsiveLayoutWithPadding>

      <B2bProfessionalsSection />

      <section className="w-full">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/pictures/thank-you-banner.png"
          alt="Thank you for shopping"
          className="w-full h-auto object-cover"
        />
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
