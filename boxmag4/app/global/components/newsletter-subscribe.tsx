"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useLanguage } from "../../i18n/language-context";

export function NewsletterSubscribe() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: "success" | "error"; message: string } | null>(
    null
  );
  const { t, language } = useLanguage();
  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const handleSubscribe = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      setFeedback({
        kind: "error",
        message: t("newsletter.errorEmailRequired"),
      });
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedEmail)) {
      setFeedback({
        kind: "error",
        message: t("newsletter.errorEmailInvalid"),
      });
      return;
    }

    if (!consent) {
      setFeedback({
        kind: "error",
        message: t("newsletter.errorConsentRequired"),
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/newsletter/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: normalizedEmail,
          consent: true,
          locale: language,
          source: "footer-newsletter",
        }),
      });

      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };

      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Failed to subscribe");
      }

      setEmail("");
      setConsent(false);
      setFeedback({
        kind: "success",
        message: t("newsletter.success"),
      });
    } catch (error) {
      setFeedback({
        kind: "error",
        message:
          error instanceof Error && error.message.trim().length > 0
            ? error.message
            : t("newsletter.errorSubmit"),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="w-full py-12 px-6 lg:px-20 ">
      <div className="max-w-7xl mx-auto">
        <div className="bg-my-yellow rounded-3xl px-8 py-10 lg:px-12 lg:py-12 flex flex-col lg:flex-row items-center gap-8 lg:gap-12">
          {/* Left: headline, checkbox, input + button */}
          <div className="flex-1 w-full space-y-6">
            <h2 className="text-2xl lg:text-3xl font-bold text-black uppercase leading-tight">
              {t("newsletter.title1")}
              <br />
              {t("newsletter.title2")}
            </h2>
            <label className="flex gap-3 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={consent}
                onChange={(e) => setConsent(e.target.checked)}
                className="mt-1 h-5 w-5 rounded border-2 border-my-yellow-bright bg-white accent-my-blue focus:ring-my-blue"
              />
              <span className="text-sm text-gray-500">
                {t("newsletter.consentStart")}{" "}
                <Link
                  href="/privacy"
                  className="text-amber-800 font-medium underline hover:text-amber-900"
                >
                  {t("newsletter.privacyPolicy")}
                </Link>
                .
              </span>
            </label>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                placeholder={t("newsletter.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 min-w-0 h-12 rounded-lg border border-gray-200 bg-white px-4 text-black placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-my-blue"
              />
              <button
                type="button"
                onClick={handleSubscribe}
                disabled={isSubmitting}
                className="shrink-0 h-12 px-6 rounded-lg bg-my-red text-white font-semibold uppercase hover:bg-my-blue transition-colors"
              >
                {isSubmitting ? t("newsletter.subscribing") : t("newsletter.subscribe")}
              </button>
            </div>
            {feedback ? (
              <p
                className={
                  feedback.kind === "success"
                    ? "text-sm text-green-700 font-medium"
                    : "text-sm text-red-700 font-medium"
                }
              >
                {feedback.message}
              </p>
            ) : null}
          </div>
          {/* Right: illustration */}
          <div className="shrink-0 w-full max-w-xs lg:max-w-sm flex justify-center">
            <Image
              src="/svgs/subscribe.svg"
              alt="Subscribe to newsletter"
              width={320}
              height={240}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
