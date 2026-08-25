"use client";

import Link from "next/link";
import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import {
  FaCheckCircle,
  FaExclamationTriangle,
  FaEye,
  FaEyeSlash,
} from "react-icons/fa";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { getBackendBaseUrl } from "../../lib/backend-url";
import { useLanguage } from "../i18n/language-context";

type ResetState = "form" | "success" | "error";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";

function ResetPasswordPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const token = searchParams.get("token")?.trim() ?? "";

  const [state, setState] = useState<ResetState>(token ? "form" : "error");
  const [message, setMessage] = useState(token ? "" : t("resetPassword.invalidLink"));
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      setError(t("resetPassword.tooShort"));
      return;
    }
    if (password !== confirm) {
      setError(t("resetPassword.mismatch"));
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/auth/reset-password`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token, password }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        setState("error");
        setMessage(payload.message ?? t("resetPassword.expired"));
        return;
      }
      setState("success");
      setMessage(t("resetPassword.successMessage"));
    } catch (_error) {
      setState("error");
      setMessage(t("resetPassword.tryAgain"));
    } finally {
      setIsSubmitting(false);
    }
  };

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
            {t("resetPassword.breadcrumb")}
          </span>
        </div>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-20 py-12">
        <div className="max-w-2xl mx-auto rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
          {state === "form" ? (
            <>
              <h1 className="text-2xl font-bold text-gray-900">
                {t("resetPassword.title")}
              </h1>
              <p className="mt-2 text-sm text-gray-600">
                {t("resetPassword.subtitle")}
              </p>
              <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
                <div>
                  <label
                    htmlFor="reset-password"
                    className="mb-1 block text-xs font-semibold uppercase text-gray-500"
                  >
                    {t("resetPassword.newPassword")}
                  </label>
                  <div className="relative">
                    <input
                      id="reset-password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className={`${inputClass} pr-12`}
                      placeholder={t("resetPassword.passwordPlaceholder")}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                      aria-label={
                        showPassword
                          ? t("registration.hidePassword")
                          : t("registration.showPassword")
                      }
                    >
                      {showPassword ? (
                        <FaEyeSlash className="h-4 w-4" />
                      ) : (
                        <FaEye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="reset-password-confirm"
                    className="mb-1 block text-xs font-semibold uppercase text-gray-500"
                  >
                    {t("resetPassword.confirmPassword")}
                  </label>
                  <input
                    id="reset-password-confirm"
                    type={showPassword ? "text" : "password"}
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className={inputClass}
                    placeholder={t("resetPassword.passwordPlaceholder")}
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
                    ? t("resetPassword.submitting")
                    : t("resetPassword.submit")}
                </button>
              </form>
            </>
          ) : (
            <div className="flex items-start gap-4">
              <div className="mt-1">
                {state === "success" ? (
                  <FaCheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <FaExclamationTriangle className="h-6 w-6 text-yellow-600" />
                )}
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-gray-900">
                  {state === "success"
                    ? t("resetPassword.successTitle")
                    : t("resetPassword.errorTitle")}
                </h1>
                <p className="mt-2 text-sm text-gray-600">
                  {message || t("resetPassword.expired")}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    href="/account"
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
                  >
                    {t("resetPassword.goToSignIn")}
                  </Link>
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

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ResetPasswordPageContent />
    </Suspense>
  );
}
