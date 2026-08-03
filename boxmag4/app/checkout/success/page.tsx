"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FaCheckCircle, FaUserPlus } from "react-icons/fa";
import { B2b } from "../../global/components/b2b";
import ResponsiveLayoutWithPadding from "../../ResponsiveLayoutWithPadding";
import { ServicesSection } from "../../global/components/services-section";
import { HaveAQuestion } from "../../global/components/have-a-question";
import { NewsletterSubscribe } from "../../global/components/newsletter-subscribe";
import { useCartStore } from "../../stores/cart_store";
import { buildRegistrationUrlFromCheckout } from "../../../lib/checkout-order-success";
import { AUTH_STORAGE_KEY } from "../../../lib/customer-auth";
import { useLanguage } from "../../i18n/language-context";

type OrderInfo = {
  id: number;
  orderNumber: string;
};

type SessionResponse = {
  ok: boolean;
  message?: string;
  data?: {
    sessionId: string;
    paymentStatus: string;
    customerEmail: string | null;
    order: OrderInfo | null;
  };
};

function BenefitItem({ text }: { text: string }) {
  return (
    <li className="flex items-start gap-2 text-sm text-gray-700">
      <FaCheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-green-600" />
      <span>{text}</span>
    </li>
  );
}

function CheckoutSuccessPageContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const clearCart = useCartStore((s) => s.clearCart);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<SessionResponse["data"] | null>(null);
  const [isGuest, setIsGuest] = useState(true);

  useEffect(() => {
    try {
      setIsGuest(localStorage.getItem(AUTH_STORAGE_KEY) !== "true");
    } catch {
      setIsGuest(true);
    }
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setError("Missing payment session id.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const fetchSession = async () => {
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/payments/sessions/${encodeURIComponent(sessionId)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as SessionResponse;
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error(
            payload.message ?? `Failed with status ${response.status}`,
          );
        }
        setData(payload.data);
        if (
          payload.data.paymentStatus === "paid" ||
          payload.data.paymentStatus === "no_payment_required"
        ) {
          clearCart();
          try {
            sessionStorage.removeItem("boxmag.checkout.pendingOrderId");
          } catch (_storageError) {
            // ignore
          }
        }
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        setError(
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to verify payment.",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void fetchSession();
    return () => controller.abort();
  }, [backendBaseUrl, sessionId, clearCart]);

  const isPaid =
    data?.paymentStatus === "paid" ||
    data?.paymentStatus === "no_payment_required";

  const registrationEmail = data?.customerEmail?.trim() || "";
  const registrationUrl =
    registrationEmail.length > 0
      ? buildRegistrationUrlFromCheckout({ email: registrationEmail })
      : "/registration?from=checkout&returnTo=%2Faccount%23orders";

  return (
    <div>
      <B2b />
      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            {t("common.home")}
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">
            {t("checkout.breadcrumb.checkout")}
          </span>
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">
            {t("checkoutSuccess.breadcrumb")}
          </span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        <div className="mx-auto w-full max-w-3xl space-y-6">
          <div className="rounded-lg border border-gray-200 bg-white px-6 py-10 sm:px-10 sm:py-12 text-center">
            {isLoading ? (
              <>
                <h1 className="text-2xl font-bold text-black">
                  {t("checkoutSuccess.verifyingTitle")}
                </h1>
                <p className="mt-3 text-sm text-gray-600">
                  {t("checkoutSuccess.verifyingSubtitle")}
                </p>
              </>
            ) : error ? (
              <>
                <h1 className="text-2xl font-bold text-my-red">
                  {t("checkoutSuccess.errorTitle")}
                </h1>
                <p className="mt-3 text-sm text-gray-700">{error}</p>
                <p className="mt-4 text-sm text-gray-600">
                  {t("checkoutSuccess.errorHint")}{" "}
                  <span className="font-mono text-xs">{sessionId}</span>
                </p>
                <div className="mt-8">
                  <Link
                    href="/checkout"
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                  >
                    {t("checkoutSuccess.backToCheckout")}
                  </Link>
                </div>
              </>
            ) : isPaid ? (
              <>
                <h1 className="text-2xl font-bold text-black">
                  {t("checkoutSuccess.title")}
                </h1>
                <p className="mt-3 text-sm text-gray-600">
                  {t("checkoutSuccess.subtitle")}
                </p>
                <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-left text-sm">
                  {data?.order ? (
                    <div className="flex justify-between border-b border-gray-200 py-1.5">
                      <span className="font-semibold text-gray-700">
                        {t("checkoutSuccess.order")}
                      </span>
                      <span className="text-gray-800">
                        {data.order.orderNumber}
                      </span>
                    </div>
                  ) : null}
                  {data?.customerEmail ? (
                    <p className="mt-2 text-xs text-gray-500">
                      {t("checkoutSuccess.receiptSent")}{" "}
                      <span className="font-medium">{data.customerEmail}</span>.
                    </p>
                  ) : null}
                </div>
                {!isGuest ? (
                  <div className="mt-8 flex flex-wrap justify-center gap-3">
                    <Link
                      href="/account#orders"
                      className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                    >
                      {t("checkoutSuccess.viewOrders")}
                    </Link>
                    <Link
                      href="/shop"
                      className="inline-flex items-center justify-center rounded-lg border-2 border-my-red px-5 py-2.5 text-sm font-semibold text-my-red transition-colors hover:bg-my-red/10"
                    >
                      {t("checkoutSuccess.continueShopping")}
                    </Link>
                  </div>
                ) : null}
              </>
            ) : (
              <>
                <h1 className="text-2xl font-bold text-black">
                  {t("checkoutSuccess.pendingTitle")}
                </h1>
                <p className="mt-3 text-sm text-gray-600">
                  {t("checkoutSuccess.pendingSubtitle")}{" "}
                  <span className="font-semibold">{data?.paymentStatus}</span>.{" "}
                  {t("checkoutSuccess.pendingHint")}
                </p>
                <div className="mt-8">
                  <Link
                    href={isGuest ? "/shop" : "/account#orders"}
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                  >
                    {isGuest
                      ? t("checkoutSuccess.continueShopping")
                      : t("checkoutSuccess.viewOrders")}
                  </Link>
                </div>
              </>
            )}
          </div>

          {isPaid && isGuest ? (
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-lg">
              <div className="border-b border-gray-100 bg-gray-50 px-6 py-4 sm:px-8">
                <div className="flex items-center gap-3">
                  <FaUserPlus className="h-7 w-7 text-my-red" />
                  <h2 className="text-lg font-bold text-gray-900 sm:text-xl">
                    {t("checkoutSuccess.createAccountTitle")}
                  </h2>
                </div>
              </div>

              <div className="px-6 py-6 sm:px-8 sm:py-7">
                <ul className="space-y-2">
                  <BenefitItem text={t("checkoutSuccess.createAccountBenefit1")} />
                  <BenefitItem text={t("checkoutSuccess.createAccountBenefit2")} />
                  <BenefitItem text={t("checkoutSuccess.createAccountBenefit3")} />
                </ul>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                  <Link
                    href={registrationUrl}
                    className="inline-flex items-center justify-center rounded-lg bg-my-red px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                  >
                    {t("checkoutSuccess.createAccountCta")}
                  </Link>
                  <button
                    type="button"
                    onClick={() => router.push("/shop")}
                    className="inline-flex items-center justify-center rounded-lg border-2 border-gray-300 px-6 py-3 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50"
                  >
                    {t("checkoutSuccess.skipCta")}
                  </button>
                </div>

                <p className="mt-5 text-sm text-gray-600">
                  {t("checkoutSuccess.alreadyHaveAccount")}{" "}
                  <Link
                    href="/account"
                    className="font-semibold text-my-red hover:underline"
                  >
                    {t("checkoutSuccess.signIn")}
                  </Link>
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </ResponsiveLayoutWithPadding>
      <div className="pt-8 md:pt-12 lg:pt-16" />

      <ServicesSection />
      <HaveAQuestion />
      <NewsletterSubscribe />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
