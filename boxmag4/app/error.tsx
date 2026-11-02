"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useLanguage } from "./i18n/language-context";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useLanguage();

  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="w-full px-4 sm:px-6 lg:px-20 py-20">
      <div className="max-w-2xl mx-auto text-center">
        <h1 className="text-2xl font-bold text-gray-900">{t("errorPage.title")}</h1>
        <p className="mt-2 text-sm text-gray-600">{t("errorPage.text")}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
          >
            {t("errorPage.retry")}
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
          >
            {t("errorPage.backHome")}
          </Link>
        </div>
      </div>
    </section>
  );
}
