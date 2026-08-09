"use client";

import Link from "next/link";
import { B2b } from "../../global/components/b2b";
import ResponsiveLayoutWithPadding from "../../ResponsiveLayoutWithPadding";
import { ServicesSection } from "../../global/components/services-section";
import { HaveAQuestion } from "../../global/components/have-a-question";
import { NewsletterSubscribe } from "../../global/components/newsletter-subscribe";
import { useLanguage } from "../../i18n/language-context";

export default function CheckoutCancelPage() {
  const { t } = useLanguage();

  return (
    <div>
      <B2b />
      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("footer.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">
            {t("checkout.breadcrumb.checkout")}
          </span>
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">
            {t("checkout.cancel.breadcrumbCancelled")}
          </span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white px-6 py-10 sm:px-10 sm:py-12 text-center">
          <h1 className="text-2xl font-bold text-black">
            {t("checkout.cancel.title")}
          </h1>
          <p className="mt-3 text-sm text-gray-600">
            {t("checkout.cancel.message")}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              href="/checkout"
              className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
            >
              {t("checkout.cancel.backToCheckout")}
            </Link>
            <Link
              href="/boxesfetco"
              className="inline-flex items-center justify-center rounded-lg border-2 border-my-red px-5 py-2.5 text-sm font-semibold text-my-red transition-colors hover:bg-my-red/10"
            >
              {t("checkout.cancel.continueShopping")}
            </Link>
          </div>
        </div>
      </ResponsiveLayoutWithPadding>
      <div className="pt-8 md:pt-12 lg:pt-16" />

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
