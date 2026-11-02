"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { FaCheckCircle, FaEnvelopeOpenText, FaExclamationTriangle } from "react-icons/fa";
import { B2b } from "../../global/components/b2b";
import { getBackendBaseUrl } from "../../../lib/backend-url";
import { useLanguage } from "../../i18n/language-context";

type UnsubscribeState = "confirm" | "submitting" | "success" | "error";

function NewsletterUnsubscribePageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const email = searchParams.get("email")?.trim().toLowerCase() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const hasValidParams = email.length > 0 && token.length > 0;

  // Explicit confirm button: mail scanners that prefetch links must not
  // unsubscribe people on their own.
  const [state, setState] = useState<UnsubscribeState>(
    hasValidParams ? "confirm" : "error",
  );
  const [errorKey, setErrorKey] = useState(
    hasValidParams ? "" : "newsletterUnsubscribe.invalidLink",
  );

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const handleUnsubscribe = async () => {
    setState("submitting");
    try {
      const response = await fetch(`${backendBaseUrl}/api/newsletter/unsubscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token }),
      });
      if (response.ok) {
        setState("success");
        return;
      }
      setErrorKey(
        response.status === 400
          ? "newsletterUnsubscribe.invalidLink"
          : "newsletterUnsubscribe.tryAgain",
      );
      setState("error");
    } catch (_error) {
      setErrorKey("newsletterUnsubscribe.tryAgain");
      setState("error");
    }
  };

  const title =
    state === "success"
      ? t("newsletterUnsubscribe.successTitle")
      : state === "error"
        ? t("newsletterUnsubscribe.errorTitle")
        : t("newsletterUnsubscribe.title");

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
            {t("newsletterUnsubscribe.breadcrumb")}
          </span>
        </div>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-20 py-12">
        <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="mt-1">
              {state === "success" ? (
                <FaCheckCircle className="h-6 w-6 text-green-600" />
              ) : state === "error" ? (
                <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
              ) : (
                <FaEnvelopeOpenText className="h-6 w-6 text-my-red" />
              )}
            </div>

            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
              <p className="mt-2 text-sm text-gray-600 break-words">
                {state === "success"
                  ? t("newsletterUnsubscribe.successText").replace("{{email}}", email)
                  : state === "error"
                    ? t(errorKey)
                    : t("newsletterUnsubscribe.confirmText").replace("{{email}}", email)}
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                {state === "confirm" || state === "submitting" ? (
                  <button
                    type="button"
                    onClick={() => void handleUnsubscribe()}
                    disabled={state === "submitting"}
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors disabled:opacity-60"
                  >
                    {state === "submitting"
                      ? t("newsletterUnsubscribe.submitting")
                      : t("newsletterUnsubscribe.confirmButton")}
                  </button>
                ) : null}
                <Link
                  href="/"
                  className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  {t("newsletterUnsubscribe.backHome")}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function NewsletterUnsubscribePage() {
  return (
    <Suspense fallback={null}>
      <NewsletterUnsubscribePageContent />
    </Suspense>
  );
}
