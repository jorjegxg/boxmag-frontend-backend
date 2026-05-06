"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useParams } from "next/navigation";
import { FaBoxOpen } from "react-icons/fa";
import { B2b } from "../../../global/components/b2b";
import { ServicesSection } from "../../../global/components/services-section";
import { HaveAQuestion } from "../../../global/components/have-a-question";
import { NewsletterSubscribe } from "../../../global/components/newsletter-subscribe";
import { accountSampleOrders } from "../mock-orders";

function statusBadgeClass(status: string): string {
  if (status === "PROCESSING") return "text-yellow-600 bg-yellow-50";
  if (status === "SHIPPED") return "text-blue-600 bg-blue-50";
  if (status === "COMPLETED") return "text-green-600 bg-green-50";
  return "text-gray-600 bg-gray-50";
}

export default function AccountOrderDetailsPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderNumber = decodeURIComponent(params.orderNumber ?? "");

  const order = useMemo(
    () => accountSampleOrders.find((entry) => entry.orderNumber === orderNumber),
    [orderNumber],
  );

  return (
    <div>
      <B2b />

      <section className="w-full bg-white px-4 pt-6 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-6xl text-xs uppercase tracking-wide text-gray-500 lg:text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">→</span>
          <Link href="/account" className="hover:underline">
            Account
          </Link>
          <span className="mx-2">→</span>
          <span className="font-semibold text-gray-700">Order {orderNumber}</span>
        </div>
      </section>

      <section className="w-full px-4 py-8 sm:px-6 lg:px-20">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 rounded-lg bg-my-red px-6 py-6">
          <FaBoxOpen className="h-10 w-10 shrink-0 text-white sm:h-12 sm:w-12" />
          <h1 className="text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl lg:text-4xl">
            Order Details
          </h1>
        </div>
      </section>

      <section className="w-full px-4 pb-12 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
          {!order ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-700">
                Order not found.
              </p>
              <Link href="/account" className="text-sm font-semibold text-my-red hover:underline">
                Back to account
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Order #{order.orderNumber}</h2>
                <p className="mt-1 text-sm text-gray-600">Placed on {order.date}</p>
              </div>
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Order Number</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Date</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{order.date}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusBadgeClass(order.status)}`}
                  >
                    {order.status}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4 text-sm text-gray-600">
                More detailed order data (items, totals, shipping timeline, invoice) can be
                connected here when order details endpoint is available.
              </div>
              <Link href="/account" className="text-sm font-semibold text-my-red hover:underline">
                Back to account
              </Link>
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
