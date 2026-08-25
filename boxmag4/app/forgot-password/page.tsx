"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { FaCheckCircle, FaExclamationTriangle } from "react-icons/fa";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { getBackendBaseUrl } from "../../lib/backend-url";
import { useLanguage } from "../i18n/language-context";

type ForgotState = "form" | "exists" | "missing" | "error";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [state, setState] = useState<ForgotState>("form");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setError(t("forgotPassword.invalidEmail"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/auth/forgot-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: normalizedEmail }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        exists?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        setError(payload.message ?? t("forgotPassword.invalidEmail"));
        return;
      }
      if (payload.exists) {
        setState("exists");
        setMessage(t("forgotPassword.existsMessage"));
      } else {
        setState("missing");
        setMessage(t("forgotPassword.missingMessage"));
      }
    } catch (_error) {
      setState("error");
      setMessage(t("forgotPassword.error"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resultTitle =
    state === "exists"
      ? t("forgotPassword.existsTitle")
      : state === "missing"
        ? t("forgotPassword.missingTitle")
        : t("forgotPassword.errorTitle");

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
            {t("forgotPassword.breadcrumb")}
          </span>
        </div>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-20 py-12">
        <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {state === "form" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("forgotPassword.title")}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {t("forgotPassword.subtitle")}
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="forgot-email"
                    className="mb-1 block text-xs font-semibold uppercase text-gray-500"
                  >
                    {t("forgotPassword.emailLabel")}
                  </label>
                  <input
                    id="forgot-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputClass}
                    placeholder={t("forgotPassword.emailPlaceholder")}
                    required
                  />
                </div>
                {error ? (
                  <p className="text-sm font-medium text-red-700">{error}</p>
                ) : null}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors disabled:opacity-60"
                >
                  {isSubmitting
                    ? t("forgotPassword.submitting")
                    : t("forgotPassword.submit")}
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {state === "exists" ? (
                  <FaCheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {resultTitle}
                </h1>
                <p className="mt-2 text-sm text-gray-600">{message}</p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {state === "missing" ? (
                    <Link
                      href="/registration"
                      className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
                    >
                      {t("forgotPassword.createAccount")}
                    </Link>
                  ) : (
                    <Link
                      href="/account"
                      className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
                    >
                      {t("resetPassword.goToSignIn")}
                    </Link>
                  )}
                  <Link
                    href="/"
                    className="inline-flex items-center justify-center rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {t("resetPassword.backHome")}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}
