"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { B2b } from "../global/components/b2b";
import { ServicesSection } from "../global/components/services-section";
import { HaveAQuestion } from "../global/components/have-a-question";
import { NewsletterSubscribe } from "../global/components/newsletter-subscribe";
import { FaCheckCircle, FaUserPlus } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { isDevelopmentAppEnv } from "../../lib/app-env";
import { siteEmails } from "../../lib/site-emails";
import { clearB2bOrderSuccessPayload } from "../../lib/b2b-order-success";
import { checkVAT, countries } from "jsvat";
import { classifyVatLookup, fetchVatLookup, getCachedVatCompany } from "../../lib/vat-company";
import { getBackendBaseUrl } from "../../lib/backend-url";
import { useLanguage } from "../i18n/language-context";

const inputClass =
  "w-full rounded-lg border border-gray-300 bg-white px-4 py-3 text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red";
const lockedInputClass =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-4 py-3 text-gray-600 cursor-not-allowed focus:outline-none";
const VAT_NUMBER_REGEX = /^[A-Z]{2}[A-Z0-9]{2,12}$/;

function normalizeVatNumber(value: string): string {
  return value.trim().toUpperCase().replace(/\s+/g, "");
}

const isDevelopment = isDevelopmentAppEnv();

function RegistrationPageContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const queryEmail = searchParams.get("email")?.trim() ?? "";
  const queryFirstName = searchParams.get("firstName")?.trim() ?? "";
  const querySurname = searchParams.get("surname")?.trim() ?? "";
  const queryCompanyName = searchParams.get("companyName")?.trim() ?? "";
  const queryPhone = searchParams.get("phone")?.trim() ?? "";
  const queryVatNumber = searchParams.get("vatNumber")?.trim() ?? "";
  const returnTo = searchParams.get("returnTo")?.trim() || "/account#orders";
  const fromSource = searchParams.get("from")?.trim() ?? "";
  const fromOrderFlow = fromSource === "b2b-order" || fromSource === "checkout";
  const hasQueryPrefill = Boolean(queryEmail);

  const [email, setEmail] = useState(
    queryEmail || (isDevelopment ? siteEmails.devDemoCustomer : ""),
  );
  const [isLookingUpVat, setIsLookingUpVat] = useState(false);
  const [vatLookupError, setVatLookupError] = useState<string | null>(null);
  const [vatManualNameRequired, setVatManualNameRequired] = useState(false);
  const [vatLookupInfo, setVatLookupInfo] = useState<string | null>(null);
  const [password, setPassword] = useState(isDevelopment && !hasQueryPrefill ? "dummy123" : "");
  const [confirmPassword, setConfirmPassword] = useState(
    isDevelopment && !hasQueryPrefill ? "dummy123" : "",
  );
  const [firstName, setFirstName] = useState(
    queryFirstName || (isDevelopment && !hasQueryPrefill ? "Ion" : ""),
  );
  const [surname, setSurname] = useState(
    querySurname || (isDevelopment && !hasQueryPrefill ? "Popescu" : ""),
  );
  const [companyName, setCompanyName] = useState(
    queryCompanyName || (isDevelopment && !hasQueryPrefill ? "Boxmag Test SRL" : ""),
  );
  const [phone, setPhone] = useState(
    queryPhone || (isDevelopment && !hasQueryPrefill ? "+40 700 000 000" : ""),
  );
  const [vatNumber, setVatNumber] = useState(
    queryVatNumber || (isDevelopment && !hasQueryPrefill ? "RO12345678" : ""),
  );
  const [acceptRegulations, setAcceptRegulations] = useState(
    isDevelopment && !hasQueryPrefill,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{
    kind: "success" | "error";
    message: string;
  } | null>(null);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isEmailLocked, setIsEmailLocked] = useState(fromOrderFlow && Boolean(queryEmail));

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    if (queryEmail) setEmail(queryEmail);
    if (queryFirstName) setFirstName(queryFirstName);
    if (querySurname) setSurname(querySurname);
    if (queryCompanyName) setCompanyName(queryCompanyName);
    if (queryPhone) setPhone(queryPhone);
    if (queryVatNumber) setVatNumber(queryVatNumber);
    setIsEmailLocked(fromOrderFlow && Boolean(queryEmail));
  }, [
    fromOrderFlow,
    queryCompanyName,
    queryEmail,
    queryFirstName,
    queryPhone,
    querySurname,
    queryVatNumber,
  ]);

  useEffect(() => {
    const normalizedVat = normalizeVatNumber(vatNumber);
    if (!VAT_NUMBER_REGEX.test(normalizedVat)) {
      setCompanyName("");
      setVatLookupError(null);
      setVatManualNameRequired(false);
      setVatLookupInfo(null);
      setIsLookingUpVat(false);
      return;
    }

    const cachedCompany = getCachedVatCompany(normalizedVat);
    if (cachedCompany) {
      setCompanyName(cachedCompany);
      setVatLookupError(null);
      setVatManualNameRequired(false);
      setVatLookupInfo(null);
      setIsLookingUpVat(false);
      return;
    }

    let isCancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(async () => {
      setIsLookingUpVat(true);
      setVatLookupError(null);
      setVatLookupInfo(null);

      try {
        const payload = await fetchVatLookup(normalizedVat, controller.signal);
        if (isCancelled) return;

        const outcome = classifyVatLookup(payload);
        if (outcome.kind === "error") {
          setCompanyName("");
          setVatManualNameRequired(false);
          setVatLookupError(outcome.message ?? t("contact.vatLookupFailed"));
          return;
        }

        if (outcome.kind === "manual_name") {
          setCompanyName("");
          setVatManualNameRequired(true);
          setVatLookupInfo(t("contact.vatVerifiedManualName"));
          setVatLookupError(null);
          window.setTimeout(() => {
            document.getElementById("reg-company")?.focus();
          }, 0);
          return;
        }

        setVatManualNameRequired(false);
        setCompanyName(outcome.payload.companyName ?? "");
        setVatLookupError(null);
      } catch (error) {
        if (
          isCancelled ||
          (error instanceof DOMException && error.name === "AbortError")
        ) {
          return;
        }
        setCompanyName("");
        setVatManualNameRequired(false);
        setVatLookupError(t("contact.vatLookupFailed"));
      } finally {
        if (!isCancelled) {
          setIsLookingUpVat(false);
        }
      }
    }, 600);

    return () => {
      isCancelled = true;
      controller.abort();
      window.clearTimeout(timeoutId);
    };
  }, [vatNumber, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFeedback({ kind: "error", message: t("registration.error.emailRequired") });
      return;
    }

    if (isLookingUpVat) {
      setFeedback({
        kind: "error",
        message: t("registration.error.vatLookupInProgress"),
      });
      return;
    }

    const normalizedVat = normalizeVatNumber(vatNumber);
    if (!normalizedVat) {
      setFeedback({ kind: "error", message: t("registration.error.vatRequired") });
      return;
    }

    const vatFormatCheck = checkVAT(normalizedVat, countries);
    if (!vatFormatCheck.isValid && !vatFormatCheck.isValidFormat) {
      setFeedback({
        kind: "error",
        message: t("registration.error.vatInvalid"),
      });
      return;
    }

    if (!companyName.trim()) {
      setFeedback({
        kind: "error",
        message:
          vatLookupError?.trim() ||
          t("contact.companyNameRequired"),
      });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({ kind: "error", message: t("registration.error.passwordsMismatch") });
      return;
    }

    if (!acceptRegulations) {
      setFeedback({
        kind: "error",
        message: t("registration.error.acceptTerms"),
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          password,
          firstName,
          surname,
          companyName,
          vatNumber: normalizedVat,
          phone,
          acceptRegulations: true,
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? t("registration.failedFallback"));
      }

      if (fromSource === "b2b-order") {
        clearB2bOrderSuccessPayload();
      }

      setFeedback(null);
      setRegisteredEmail(normalizedEmail);
      setIsRegistered(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      setIsRegistered(false);
      setRegisteredEmail("");
      setFeedback({
        kind: "error",
        message:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("registration.error.failed"),
      });
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
          <span className="text-gray-700 font-semibold">{t("registration.title")}</span>
        </div>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-20 py-8">
        <div className="max-w-4xl mx-auto bg-my-red rounded-lg flex items-center justify-center gap-4 py-6 px-6">
          <FaUserPlus className="w-10 h-10 sm:w-12 sm:h-12 text-white shrink-0" />
          <h1 className="text-white text-2xl sm:text-3xl lg:text-4xl font-bold uppercase tracking-wide">
            {t("registration.title")}
          </h1>
        </div>
      </section>

      <section className="w-full px-4 sm:px-6 lg:px-20 pb-12">
        <div className="max-w-4xl mx-auto rounded-lg border-2 border-gray-200 bg-white px-6 py-6 sm:px-8 sm:py-8">
          {isRegistered ? (
            <div
              role="status"
              aria-live="polite"
              className="rounded-xl border border-green-200 bg-green-50 px-5 py-6 sm:px-7 sm:py-7"
            >
              <div className="flex items-start gap-3">
                <FaCheckCircle className="mt-0.5 h-7 w-7 shrink-0 text-green-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                    {t("registration.successBanner")}
                  </p>
                  <h2 className="mt-1 text-xl font-bold text-gray-900 sm:text-2xl">
                    {t("registration.confirmEmailTitle")}
                  </h2>
                  <p className="mt-3 text-sm text-gray-700 sm:text-base">
                    {t("registration.successBody")}
                  </p>
                  <div className="mt-4 rounded-xl border border-my-red/30 bg-white px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {t("registration.verificationEmail")}
                    </p>
                    <p className="mt-1 break-all text-base font-semibold text-my-red sm:text-lg">
                      {registeredEmail}
                    </p>
                  </div>
                  <div className="mt-6">
                    <Link
                      href={returnTo}
                      className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white hover:bg-my-red/90 transition-colors"
                    >
                      {t("registration.backToLogin")}
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              {fromSource === "b2b-order" ? (
                <p className="text-gray-600 text-sm mb-6">
                  {t("registration.hint.b2b")}
                </p>
              ) : fromSource === "checkout" ? (
                <p className="text-gray-600 text-sm mb-6">
                  {t("registration.hint.checkout")}
                </p>
              ) : (
                <p className="text-gray-600 text-sm mb-6">
                  {t("registration.hint.defaultPrefix")}{" "}
                  <Link href="/regulations" className="text-my-red font-semibold hover:underline">{t("registration.regulations")}</Link>
                  {t("registration.period")}
                </p>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-vat" className="block text-sm font-semibold text-gray-800 mb-1">{t("registration.vatNumber")}</label>
                <input
                  id="reg-vat"
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="RO12345678"
                  className={inputClass}
                  required
                  pattern="[A-Za-z]{2}\s?[A-Za-z0-9]{2,12}"
                  title={t("registration.vatTitle")}
                  aria-describedby={vatLookupError ? "reg-vat-error" : undefined}
                />
                {isLookingUpVat ? (
                  <p className="mt-1 text-sm text-gray-500">{t("registration.lookingUpVatShort")}</p>
                ) : null}
                {!isLookingUpVat && vatLookupError ? (
                  <p id="reg-vat-error" className="mt-1 text-sm text-red-600">
                    {vatLookupError}
                  </p>
                ) : null}
              </div>
              <div>
                <label htmlFor="reg-company" className="block text-sm font-semibold text-gray-800 mb-1">
                  {t("registration.companyNameLabel")}
                </label>
                <input
                  id="reg-company"
                  type="text"
                  value={companyName}
                  readOnly={!vatManualNameRequired}
                  onChange={
                    vatManualNameRequired
                      ? (e) => setCompanyName(e.target.value)
                      : undefined
                  }
                  placeholder={
                    isLookingUpVat
                      ? t("registration.lookingUpVat")
                      : vatManualNameRequired
                        ? t("contact.companyNameManualPlaceholder")
                        : t("registration.autoFilledFromVat")
                  }
                  className={vatManualNameRequired ? inputClass : lockedInputClass}
                  aria-busy={isLookingUpVat}
                  required
                />
                {!isLookingUpVat && vatLookupInfo ? (
                  <p className="mt-1 text-sm text-blue-700">{vatLookupInfo}</p>
                ) : null}
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-email" className="block text-sm font-semibold text-gray-800 mb-1">{t("registration.email")}</label>
                <input
                  id="reg-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={isEmailLocked ? lockedInputClass : inputClass}
                  readOnly={isEmailLocked}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-password" className="block text-sm font-semibold text-gray-800 mb-1">{t("registration.password")}</label>
                <div className="relative">
                  <input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder={t("registration.passwordPlaceholder")}
                    className={`${inputClass} pr-12`}
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    aria-label={showPassword ? t("registration.hidePassword") : t("registration.showPassword")}
                  >
                    {showPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label htmlFor="reg-confirm" className="block text-sm font-semibold text-gray-800 mb-1">{t("registration.confirmPasswordLabel")}</label>
                <div className="relative">
                  <input
                    id="reg-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t("registration.confirmPasswordPlaceholder")}
                    className={`${inputClass} pr-12`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                    aria-label={showConfirmPassword ? t("registration.hidePassword") : t("registration.showPassword")}
                  >
                    {showConfirmPassword ? <FaEyeSlash className="h-4 w-4" /> : <FaEye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-firstName" className="block text-sm font-semibold text-gray-800 mb-1">{t("registration.firstNameLabel")}</label>
                <input id="reg-firstName" type="text" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder={t("account.placeholder.firstName")} className={inputClass} required />
              </div>
              <div>
                <label htmlFor="reg-surname" className="block text-sm font-semibold text-gray-800 mb-1">{t("registration.surnameLabel")}</label>
                <input id="reg-surname" type="text" value={surname} onChange={(e) => setSurname(e.target.value)} placeholder={t("account.placeholder.lastName")} className={inputClass} required />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="reg-phone" className="block text-sm font-semibold text-gray-800 mb-1">{t("registration.phoneNumber")}</label>
                <input id="reg-phone" type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+40 700 000 000" className={inputClass} />
              </div>
              <div />
            </div>
            <div className="flex items-start gap-3">
              <input id="reg-accept" type="checkbox" checked={acceptRegulations} onChange={(e) => setAcceptRegulations(e.target.checked)} className="mt-1 rounded border-gray-300 text-my-red focus:ring-my-red" />
              <label htmlFor="reg-accept" className="text-sm text-gray-700">
                {t("registration.acceptCheckbox")}{" "}
                <Link href="/regulations" className="text-my-red font-semibold hover:underline">{t("registration.regulations")}</Link>{" "}
                {t("registration.and")}{" "}
                <Link href="/privacy-policy" className="text-my-red font-semibold hover:underline">{t("registration.privacyPolicy")}</Link>{" "}
                {t("registration.ofOnlineStore")}
              </label>
            </div>
            {feedback?.kind === "error" ? (
              <p className="text-sm text-red-700 font-medium">{feedback.message}</p>
            ) : null}
            <div className="flex flex-col sm:flex-row gap-4 pt-2">
              <button type="submit" disabled={isSubmitting} className="px-6 py-3 rounded-lg bg-my-red text-white font-semibold hover:bg-my-red/90 transition-colors disabled:opacity-70 disabled:cursor-not-allowed">
                {isSubmitting ? t("registration.registering") : t("registration.register")}
              </button>
              <p className="flex items-center text-sm text-gray-600">
                {t("registration.alreadyHaveAccount")}{" "}
                <Link href="/account" className="ml-1 text-my-red font-semibold hover:underline">
                  {t("registration.signInLink")}
                </Link>
              </p>
            </div>
          </form>
            </>
          )}
        </div>
      </section>

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={null}>
      <RegistrationPageContent />
    </Suspense>
  );
}
