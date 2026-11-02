"use client";

import Link from "next/link";
import { useLanguage } from "./i18n/language-context";

export default function NotFound() {
  const { t } = useLanguage();

  return (
    <section className="w-full px-4 sm:px-6 lg:px-20 py-20">
      <div className="max-w-2xl mx-auto text-center">
        <p className="text-6xl font-bold text-my-red">404</p>
        <h1 className="mt-4 text-2xl font-bold text-gray-900">{t("notFound.title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("notFound.text")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
          >
            {t("notFound.backHome")}
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("notFound.goToShop")}
          </Link>
        </div>
      </div>
    </section>
  );
}
