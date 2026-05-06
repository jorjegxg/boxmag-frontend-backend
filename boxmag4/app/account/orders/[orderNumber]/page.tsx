"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FaBoxOpen } from "react-icons/fa";
import { B2b } from "../../../global/components/b2b";
import { ServicesSection } from "../../../global/components/services-section";
import { HaveAQuestion } from "../../../global/components/have-a-question";
import { NewsletterSubscribe } from "../../../global/components/newsletter-subscribe";
const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";

type OrderDetails = {
  id: number;
  orderNumber: string;
  boxTypeName: string;
  cardboardType: string;
  cardboardColour: string;
  boxPrint: string;
  quantity: number;
  transport: string;
  size: string;
  status: string;
  companyName: string;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  message: string;
  createdAt: string;
};

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "processing" || normalized === "in progress") return "text-yellow-600 bg-yellow-50";
  if (normalized === "shipped") return "text-blue-600 bg-blue-50";
  if (normalized === "completed" || normalized === "done") return "text-green-600 bg-green-50";
  return "text-gray-600 bg-gray-50";
}

export default function AccountOrderDetailsPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderId = Number(params.orderNumber ?? "");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setOrder(null);
      setLoadError("Invalid order id.");
      setIsLoading(false);
      return;
    }

    const loggedInEmail = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "";
    const backendBaseUrl =
      process.env.NEXT_PUBLIC_BACKEND_URL?.trim()?.replace(/\/$/, "") ??
      "http://localhost:3005";
    const controller = new AbortController();

    const loadOrder = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/orders/${orderId}?email=${encodeURIComponent(loggedInEmail)}`,
          { signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: OrderDetails;
        };
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error(payload.message ?? "Failed to load order details");
        }
        setOrder(payload.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setOrder(null);
        setLoadError(error instanceof Error ? error.message : "Failed to load order details");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadOrder();
    return () => controller.abort();
  }, [orderId]);

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
          <span className="font-semibold text-gray-700">
            {order ? `Order ${order.orderNumber}` : `Order #${orderId}`}
          </span>
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
          {isLoading ? (
            <p className="text-sm text-gray-600">Loading order details...</p>
          ) : loadError ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-700">{loadError}</p>
              <Link href="/account" className="text-sm font-semibold text-my-red hover:underline">
                Back to account
              </Link>
            </div>
          ) : !order ? (
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
                <p className="mt-1 text-sm text-gray-600">
                  Placed on {new Date(order.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Order Number</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Date</p>
                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">Status</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusBadgeClass(order.status)}`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>
              </div>
              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                  Items
                </h3>
                <div className="mt-3 space-y-3 text-sm text-gray-700">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span>{order.boxTypeName}</span>
                    <span className="font-medium">{order.quantity} pcs</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                    <span>Cardboard: {order.cardboardType}</span>
                    <span className="font-medium">{order.cardboardColour}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Print</span>
                    <span className="font-medium">{order.boxPrint}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Shipping Address
                  </h3>
                  <div className="mt-3 space-y-1 text-sm text-gray-700">
                    <p className="font-medium">{order.customerName}</p>
                    <p>{order.companyName}</p>
                    <p>{order.city}</p>
                    <p>{order.country}</p>
                    <p>{order.phone}</p>
                    <p>{order.email}</p>
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Order Metadata
                  </h3>
                  <div className="mt-3 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>Transport</span>
                      <span>{order.transport}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Size</span>
                      <span>{order.size}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Attachment</span>
                      <span>{order.attachmentName ?? "None"}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                  Customer Message
                </h3>
                <div className="mt-3 space-y-2 text-sm text-gray-700">
                  <p>{order.message || "No message provided."}</p>
                </div>
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
