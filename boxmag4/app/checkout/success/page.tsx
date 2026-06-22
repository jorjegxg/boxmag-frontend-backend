"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { B2b } from "../../global/components/b2b";
import ResponsiveLayoutWithPadding from "../../ResponsiveLayoutWithPadding";
import { ServicesSection } from "../../global/components/services-section";
import { HaveAQuestion } from "../../global/components/have-a-question";
import { NewsletterSubscribe } from "../../global/components/newsletter-subscribe";
import { useCartStore } from "../../stores/cart_store";
import { formatMoneyAmount } from "../../../lib/format-price";

type OrderInfo = {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  totalAmountCents: number | null;
  currency: string | null;
  quantity: number;
  transport: string;
  createdAt: string;
};

type SessionResponse = {
  ok: boolean;
  message?: string;
  data?: {
    sessionId: string;
    paymentStatus: string;
    amountTotal: number | null;
    currency: string | null;
    customerEmail: string | null;
    order: OrderInfo | null;
  };
};

function CheckoutSuccessPageContent() {
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
  const totalCents =
    data?.amountTotal ?? data?.order?.totalAmountCents ?? null;
  const orderCurrency =
    data?.order?.currency?.trim().toLowerCase() === "ron" ? "ron" : "eur";
  const totalDisplay =
    totalCents != null
      ? formatMoneyAmount(totalCents / 100, orderCurrency)
      : null;

  return (
    <div>
      <B2b />
      <section className="w-full bg-white px-4 sm:px-6 lg:px-20 pt-6">
        <div className="max-w-7xl mx-auto text-xs lg:text-sm text-gray-500 uppercase tracking-wide">
          <Link href="/" className="hover:underline">
            Home
          </Link>{" "}
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Checkout</span>
          <span className="mx-2">→</span>
          <span className="text-gray-700 font-semibold">Confirmation</span>
        </div>
      </section>

      <div className="pt-8 md:pt-12 lg:pt-16" />
      <ResponsiveLayoutWithPadding>
        <div className="mx-auto w-full max-w-3xl rounded-lg border border-gray-200 bg-white px-6 py-10 sm:px-10 sm:py-12 text-center">
          {isLoading ? (
            <>
              <h1 className="text-2xl font-bold text-black">
                Verifying your payment...
              </h1>
              <p className="mt-3 text-sm text-gray-600">
                Please wait while we confirm your transaction with Stripe.
              </p>
            </>
          ) : error ? (
            <>
              <h1 className="text-2xl font-bold text-my-red">
                We could not verify your payment
              </h1>
              <p className="mt-3 text-sm text-gray-700">{error}</p>
              <p className="mt-4 text-sm text-gray-600">
                If you were charged, please contact us with this session id:{" "}
                <span className="font-mono text-xs">{sessionId}</span>
              </p>
              <div className="mt-8">
                <Link
                  href="/checkout"
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                >
                  Back to checkout
                </Link>
              </div>
            </>
          ) : isPaid ? (
            <>
              <h1 className="text-2xl font-bold text-black">
                Thank you! Payment received.
              </h1>
              <p className="mt-3 text-sm text-gray-600">
                Your order has been confirmed and is now being processed.
              </p>
              <div className="mt-6 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4 text-left text-sm">
                {data?.order ? (
                  <>
                    <div className="flex justify-between border-b border-gray-200 py-1.5">
                      <span className="font-semibold text-gray-700">
                        Order
                      </span>
                      <span className="text-gray-800">
                        {data.order.orderNumber}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1.5">
                      <span className="font-semibold text-gray-700">
                        Shipping
                      </span>
                      <span className="text-gray-800">
                        {data.order.transport}
                      </span>
                    </div>
                    <div className="flex justify-between border-b border-gray-200 py-1.5">
                      <span className="font-semibold text-gray-700">
                        Quantity
                      </span>
                      <span className="text-gray-800">
                        {data.order.quantity}
                      </span>
                    </div>
                  </>
                ) : null}
                {totalDisplay ? (
                  <div className="flex justify-between py-1.5">
                    <span className="font-semibold text-gray-700">Total</span>
                    <span className="text-gray-800">{totalDisplay}</span>
                  </div>
                ) : null}
                {data?.customerEmail ? (
                  <p className="mt-2 text-xs text-gray-500">
                    A receipt has been sent to{" "}
                    <span className="font-medium">{data.customerEmail}</span>.
                  </p>
                ) : null}
              </div>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                >
                  View my orders
                </Link>
                <Link
                  href="/boxesfetco"
                  className="inline-flex items-center justify-center rounded-lg border-2 border-my-red px-5 py-2.5 text-sm font-semibold text-my-red transition-colors hover:bg-my-red/10"
                >
                  Continue shopping
                </Link>
              </div>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-bold text-black">
                Payment is still pending
              </h1>
              <p className="mt-3 text-sm text-gray-600">
                Stripe reports the payment status as{" "}
                <span className="font-semibold">{data?.paymentStatus}</span>.
                We will update your order as soon as the payment is confirmed.
              </p>
              <div className="mt-8">
                <Link
                  href="/account"
                  className="inline-flex items-center justify-center rounded-lg bg-my-red px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-my-red/90"
                >
                  View my orders
                </Link>
              </div>
            </>
          )}
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
