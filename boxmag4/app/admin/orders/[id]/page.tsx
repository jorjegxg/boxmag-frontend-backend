"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type OrderItem = {
  itemNo: string;
  name: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  imageUrl: string | null;
};

type PriceBreakdown = {
  subtotal: number | null;
  vatPercent: number | null;
  vatAmount: number | null;
  shipping: number | null;
  total: number | null;
  currency: string | null;
  shippingMethod: string | null;
  shippingEta: string | null;
};

type AdminOrderDetails = {
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
  paymentStatus: string | null;
  companyName: string;
  customerName: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  message: string;
  items: OrderItem[] | null;
  priceBreakdown: PriceBreakdown | null;
  attachmentName: string | null;
  createdAt: string;
};

type OrderStatusValue = "new" | "in progress" | "completed" | "done";
const ORDER_STATUS_OPTIONS: OrderStatusValue[] = [
  "new",
  "in progress",
  "completed",
  "done",
];

const FALLBACK_PRODUCT_IMAGE = "/b2b/boxes/box.png";

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "processing" || normalized === "in progress") {
    return "text-yellow-600 bg-yellow-50";
  }
  if (normalized === "shipped") return "text-blue-600 bg-blue-50";
  if (normalized === "completed" || normalized === "done") {
    return "text-green-600 bg-green-50";
  }
  return "text-gray-600 bg-gray-50";
}

function paymentBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "paid") return "text-green-700 bg-green-50";
  if (normalized === "pending") return "text-yellow-700 bg-yellow-50";
  if (normalized === "failed") return "text-red-700 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

function formatCurrency(value: number | null, currency: string | null): string {
  if (value == null) return "—";
  const code = (currency ?? "EUR").toUpperCase();
  const symbol =
    code === "EUR" ? "€" : code === "USD" ? "$" : code === "GBP" ? "£" : `${code} `;
  return `${symbol}${value.toFixed(2)}`;
}

function parseStripeMessageItems(message: string): OrderItem[] {
  if (!message.includes("Stripe checkout cart order")) return [];
  const itemLines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));

  return itemLines
    .map((line) => {
      const raw = line.slice(2).trim();
      const parts = raw.split("|").map((part) => part.trim());
      if (parts.length < 5) return null;

      const itemNo = parts[0] ?? "";
      const name = parts[1] ?? itemNo;
      const qtyMatch = (parts[2] ?? "").match(/qty\s+([0-9]+(?:\.[0-9]+)?)/i);
      const unitMatch = (parts[3] ?? "").match(/unit\s+([0-9]+(?:\.[0-9]+)?)/i);
      const lineMatch = (parts[4] ?? "").match(/line\s+([0-9]+(?:\.[0-9]+)?)/i);

      const quantity = qtyMatch ? Number(qtyMatch[1]) : 0;
      const unitPrice = unitMatch ? Number(unitMatch[1]) : 0;
      const lineTotal = lineMatch
        ? Number(lineMatch[1])
        : +(quantity * unitPrice).toFixed(2);

      if (!itemNo && !name) return null;
      return {
        itemNo,
        name,
        quantity: Number.isFinite(quantity) ? quantity : 0,
        unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
        lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0,
        imageUrl: null,
      } satisfies OrderItem;
    })
    .filter((entry): entry is OrderItem => entry !== null);
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-sm font-medium text-gray-900">{value || "—"}</p>
    </div>
  );
}

export default function AdminOrderDetailsPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const orderId = Number(params.id ?? "");
  const [order, setOrder] = useState<AdminOrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setOrder(null);
      setLoadError("Invalid order id.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadOrder = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(`${backendBaseUrl}/api/orders/${orderId}`, {
          signal: controller.signal,
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: AdminOrderDetails;
        };
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error(payload.message ?? "Failed to load order details");
        }
        setOrder(payload.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setOrder(null);
        setLoadError(
          error instanceof Error ? error.message : "Failed to load order details",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadOrder();
    return () => controller.abort();
  }, [backendBaseUrl, orderId]);

  const isCartOrder = useMemo(
    () => Array.isArray(order?.items) && (order?.items?.length ?? 0) > 0,
    [order],
  );

  const parsedMessageItems = useMemo(
    () => (order?.message ? parseStripeMessageItems(order.message) : []),
    [order?.message],
  );

  const displayItems = useMemo(
    () => (isCartOrder ? order?.items ?? [] : parsedMessageItems),
    [isCartOrder, order?.items, parsedMessageItems],
  );

  const hasDisplayItems = displayItems.length > 0;

  const cleanCustomerMessage = useMemo(() => {
    if (!order?.message) return "";
    if (!hasDisplayItems) return order.message;
    if (order.message.startsWith("Stripe checkout cart order")) return "";
    return order.message;
  }, [order, hasDisplayItems]);

  const handleStatusChange = async (nextStatus: OrderStatusValue) => {
    if (!order) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      const response = await fetch(`${backendBaseUrl}/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      const payload = (await response.json()) as { ok?: boolean; message?: string };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? `Failed with status ${response.status}`);
      }
      setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (error) {
      setStatusError(
        error instanceof Error ? error.message : "Failed to update order status",
      );
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const selectedStatus = ORDER_STATUS_OPTIONS.includes(
    (order?.status ?? "").toLowerCase() as OrderStatusValue,
  )
    ? ((order?.status ?? "").toLowerCase() as OrderStatusValue)
    : "new";

  return (
    <div>
      <section className="w-full bg-white px-6 pt-6 lg:px-20">
        <div className="mx-auto max-w-7xl text-xs uppercase tracking-wide text-gray-500 lg:text-sm">
          <Link href="/" className="hover:underline">
            Home
          </Link>
          <span className="mx-2">→</span>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
          <span className="mx-2">→</span>
          <span className="font-semibold text-gray-700">
            {order ? order.orderNumber : `Order #${orderId}`}
          </span>
        </div>
      </section>

      <section className="w-full bg-white px-6 py-8 lg:px-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-black/15 bg-white">
          <div className="border-b border-gray-200 px-6 py-5 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Order details</h1>
            <p className="mt-1 text-sm text-gray-600">
              Full order information from orders + contacts
            </p>
          </div>

          <div className="space-y-6 p-6 lg:p-8">
            {isLoading ? (
              <p className="text-sm text-gray-600">Loading order details...</p>
            ) : loadError ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-700">{loadError}</p>
                <Link href="/admin" className="text-sm font-semibold text-my-red hover:underline">
                  Back to admin
                </Link>
              </div>
            ) : !order ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-700">Order not found.</p>
                <Link href="/admin" className="text-sm font-semibold text-my-red hover:underline">
                  Back to admin
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">{order.orderNumber}</h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Placed on {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="inline-flex h-9 items-center rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Back to orders list
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Status</p>
                    <select
                      value={selectedStatus}
                      disabled={isUpdatingStatus}
                      onChange={(event) =>
                        void handleStatusChange(event.target.value as OrderStatusValue)
                      }
                      className="mt-2 h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
                    >
                      {ORDER_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                    {statusError ? (
                      <p className="mt-1 text-xs text-red-600">{statusError}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Order status</p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusBadgeClass(order.status)}`}
                    >
                      {order.status}
                    </span>
                  </div>
                  {order.paymentStatus ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">Payment</p>
                      <span
                        className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${paymentBadgeClass(order.paymentStatus)}`}
                      >
                        {order.paymentStatus}
                      </span>
                    </div>
                  ) : null}
                  <DetailField label="Total quantity" value={String(order.quantity)} />
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Customer
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Name" value={order.customerName} />
                    <DetailField label="Company" value={order.companyName} />
                    <DetailField label="Email" value={order.email} />
                    <DetailField label="Phone" value={order.phone} />
                    <DetailField label="City" value={order.city} />
                    <DetailField label="Country" value={order.country} />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Product specification
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Box type" value={order.boxTypeName} />
                    <DetailField label="Cardboard type" value={order.cardboardType} />
                    <DetailField label="Cardboard colour" value={order.cardboardColour} />
                    <DetailField label="Box print" value={order.boxPrint} />
                    <DetailField label="Size" value={order.size} />
                    <DetailField label="Transport" value={order.transport} />
                    <DetailField label="Attachment" value={order.attachmentName ?? "No"} />
                  </div>
                </div>

                {hasDisplayItems ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Items ({displayItems.length})
                    </h3>
                    <div className="mt-4 space-y-3">
                      {displayItems.map((item) => {
                        const imageSrc = item.imageUrl ?? FALLBACK_PRODUCT_IMAGE;
                        const currency = order.priceBreakdown?.currency ?? null;
                        return (
                          <div
                            key={`${item.itemNo}-${item.name}`}
                            className="flex flex-col gap-4 rounded-lg border border-gray-100 bg-gray-50/40 p-4 sm:flex-row sm:items-center"
                          >
                            <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-md border border-gray-200 bg-white">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={imageSrc}
                                alt={item.name}
                                className="h-full w-full object-contain"
                                onError={(e) => {
                                  (e.currentTarget as HTMLImageElement).src =
                                    FALLBACK_PRODUCT_IMAGE;
                                }}
                              />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {item.itemNo}
                              </p>
                              <p className="mt-1 text-sm font-bold text-gray-900">{item.name}</p>
                              <p className="mt-2 text-xs text-gray-600">
                                {item.quantity} × {formatCurrency(item.unitPrice, currency)}
                              </p>
                            </div>
                            <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Line total
                              </p>
                              <p className="text-base font-bold text-gray-900">
                                {formatCurrency(item.lineTotal, currency)}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {order.priceBreakdown ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Order total
                    </h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(
                            order.priceBreakdown.subtotal,
                            order.priceBreakdown.currency,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>
                          VAT
                          {order.priceBreakdown.vatPercent != null
                            ? ` (${order.priceBreakdown.vatPercent}%)`
                            : ""}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(
                            order.priceBreakdown.vatAmount,
                            order.priceBreakdown.currency,
                          )}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>
                          Shipping
                          {order.priceBreakdown.shippingMethod
                            ? ` (${order.priceBreakdown.shippingMethod}${
                                order.priceBreakdown.shippingEta
                                  ? ` · ${order.priceBreakdown.shippingEta}`
                                  : ""
                              })`
                            : ""}
                        </span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(
                            order.priceBreakdown.shipping,
                            order.priceBreakdown.currency,
                          )}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3">
                        <span className="text-sm font-bold uppercase tracking-wide text-gray-800">
                          Total
                        </span>
                        <span className="text-base font-bold text-my-red">
                          {formatCurrency(
                            order.priceBreakdown.total,
                            order.priceBreakdown.currency,
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {cleanCustomerMessage.trim().length > 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Customer message
                    </h3>
                    <div className="mt-3 whitespace-pre-line text-sm text-gray-700">
                      {cleanCustomerMessage}
                    </div>
                  </div>
                ) : null}

                {!hasDisplayItems && order.message.trim().length > 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Raw message
                    </h3>
                    <div className="mt-3 whitespace-pre-line text-sm text-gray-700">
                      {order.message}
                    </div>
                  </div>
                ) : null}
              </>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
