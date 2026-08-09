"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaCheckCircle, FaExclamationTriangle, FaSpinner } from "react-icons/fa";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { getBackendBaseUrl } from "../../lib/backend-url";
import { useLanguage } from "../i18n/language-context";

type VerifyState = "loading" | "success" | "error";

function VerifyEmailPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";
  const [state, setState] = useState<VerifyState>("loading");
  const [message, setMessage] = useState("");

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    const runVerification = async () => {
      if (!token) {
        setState("error");
        setMessage(t("verifyEmail.invalidLink"));
        return;
      }

      setState("loading");
      setMessage(t("verifyEmail.verifying"));
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );

        if (!response.ok) {
          setState("error");
          setMessage(t("verifyEmail.expired"));
          return;
        }

        setState("success");
        setMessage(t("verifyEmail.successMessage"));
      } catch (_error) {
        setState("error");
        setMessage(t("verifyEmail.tryAgain"));
      }
    };

    void runVerification();
  }, [backendBaseUrl, t, token]);

  return (
    <div>
      <B2b />

      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-4xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("footer.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">
            {t("verifyEmail.breadcrumb")}
          </span>
        </div>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-20 py-12">
        <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {state === "loading" ? (
                <FaSpinner className="h-6 w-6 animate-spin text-my-red" />
              ) : state === "success" ? (
                <FaCheckCircle className="h-6 w-6 text-green-600" />
              ) : (
                <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">
                {state === "loading"
                  ? t("verifyEmail.verifyingTitle")
                  : state === "success"
                    ? t("verifyEmail.successTitle")
                    : t("verifyEmail.errorTitle")}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {message || t("verifyEmail.verifying")}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {state === "success" ? (
                  <Link
                    href="/account"
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
                  >
                    {t("verifyEmail.goToSignIn")}
                  </Link>
                ) : (
                  <Link
                    href="/registration"
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
                  >
                    {t("verifyEmail.registerAgain")}
                  </Link>
                )}
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t("verifyEmail.backHome")}
                </Link>
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

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={null}>
      <VerifyEmailPageContent />
    </Suspense>
  );
}
