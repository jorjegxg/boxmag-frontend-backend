"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { FaBoxOpen } from "react-icons/fa";
import { B2b } from "../../../global/components/b2b";
import { ServicesSection } from "../../../global/components/services-section";
import { HaveAQuestion } from "../../../global/components/have-a-question";
import { NewsletterSubscribe } from "../../../global/components/newsletter-subscribe";
import { useCartStore } from "../../../stores/cart_store";
import { useNotification } from "../../../global/components/notification-center";
const AUTH_EMAIL_STORAGE_KEY = "boxmag.auth.email";
const FALLBACK_PRODUCT_IMAGE = "/b2b/boxes/box.png";

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

function statusBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "processing" || normalized === "in progress") return "text-yellow-600 bg-yellow-50";
  if (normalized === "shipped") return "text-blue-600 bg-blue-50";
  if (normalized === "completed" || normalized === "done") return "text-green-600 bg-green-50";
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
  const symbol = code === "EUR" ? "€" : code === "USD" ? "$" : code === "GBP" ? "£" : `${code} `;
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
      const lineTotal = lineMatch ? Number(lineMatch[1]) : +(quantity * unitPrice).toFixed(2);

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

export default function AccountOrderDetailsPage() {
  const params = useParams<{ orderNumber: string }>();
  const orderId = Number(params.orderNumber ?? "");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const addCartItem = useCartStore((s) => s.addItem);
  const { notify } = useNotification();

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

  const handleReorder = () => {
    if (!hasDisplayItems) {
      notify({
        type: "warning",
        message: "This order has no items to add to cart.",
      });
      return;
    }

    displayItems.forEach((item) => {
      addCartItem({
        itemNo: item.itemNo,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        imageUrl: item.imageUrl ?? FALLBACK_PRODUCT_IMAGE,
      });
    });

    notify({
      type: "success",
      message: `${displayItems.length} item(s) from this order were added to cart.`,
    });
  };

  const cleanCustomerMessage = useMemo(() => {
    if (!order?.message) return "";
    if (!hasDisplayItems) return order.message;
    // Hide the auto-generated stripe checkout dump that we now render visually.
    if (order.message.startsWith("Stripe checkout cart order")) return "";
    return order.message;
  }, [order, hasDisplayItems]);

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
                <button
                  type="button"
                  onClick={handleReorder}
                  disabled={!hasDisplayItems}
                  className="mt-3 inline-flex items-center rounded-md bg-my-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-my-red/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Add this order to cart
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-4">
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
                {order.paymentStatus ? (
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">Payment</p>
                    <span
                      className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${paymentBadgeClass(order.paymentStatus)}`}
                    >
                      {order.paymentStatus.toUpperCase()}
                    </span>
                  </div>
                ) : null}
              </div>

              {hasDisplayItems ? (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Items ({displayItems.length})
                  </h3>
                  <div className="mt-4 space-y-3">
                    {displayItems.map((item) => {
                      const imageSrc = item.imageUrl ?? FALLBACK_PRODUCT_IMAGE;
                      const currency = order.priceBreakdown?.currency ?? null;
                      return (
                        <div
                          key={item.itemNo}
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
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {item.itemNo}
                            </p>
                            <p className="mt-1 text-sm font-bold text-gray-900">
                              {item.name}
                            </p>
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
              ) : (
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
              )}

              {order.priceBreakdown ? (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Order Total
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

                {!hasDisplayItems ? (
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
                ) : null}
              </div>

              {cleanCustomerMessage.trim().length > 0 ? (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Customer Message
                  </h3>
                  <div className="mt-3 whitespace-pre-line text-sm text-gray-700">
                    {cleanCustomerMessage}
                  </div>
                </div>
              ) : null}

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
