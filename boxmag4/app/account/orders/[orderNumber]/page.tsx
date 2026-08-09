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
import { OrderAttachmentActions } from "../../../global/components/order-attachment-actions";
import { useLanguage } from "../../../i18n/language-context";
import { getBackendBaseUrl } from "../../../../lib/backend-url";
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
  hasAttachment: boolean;
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

function formatCurrency(value: number | null): string {
  if (value == null) return "—";
  return `€${value.toFixed(2)}`;
}

function parseStripeMessageItems(message: string): OrderItem[] {
  if (!message.includes("Stripe checkout cart order")) return [];
  const itemLines = message
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "));

  const items: OrderItem[] = [];
  for (const line of itemLines) {
    const raw = line.slice(2).trim();
    const parts = raw.split("|").map((part) => part.trim());
    if (parts.length < 5) continue;

    const itemNo = parts[0] ?? "";
    const name = parts[1] ?? itemNo;
    const qtyMatch = (parts[2] ?? "").match(/qty\s+([0-9]+(?:\.[0-9]+)?)/i);
    const unitMatch = (parts[3] ?? "").match(/unit\s+([0-9]+(?:\.[0-9]+)?)/i);
    const lineMatch = (parts[4] ?? "").match(/line\s+([0-9]+(?:\.[0-9]+)?)/i);

    const quantity = qtyMatch ? Number(qtyMatch[1]) : 0;
    const unitPrice = unitMatch ? Number(unitMatch[1]) : 0;
    const lineTotal = lineMatch ? Number(lineMatch[1]) : +(quantity * unitPrice).toFixed(2);

    if (!itemNo && !name) continue;
    items.push({
      itemNo,
      name,
      quantity: Number.isFinite(quantity) ? quantity : 0,
      unitPrice: Number.isFinite(unitPrice) ? unitPrice : 0,
      lineTotal: Number.isFinite(lineTotal) ? lineTotal : 0,
      imageUrl: null,
    });
  }
  return items;
}

export default function AccountOrderDetailsPage() {
  const { t } = useLanguage();
  const params = useParams<{ orderNumber: string }>();
  const orderId = Number(params.orderNumber ?? "");
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accountEmail, setAccountEmail] = useState("");
  const addCartItem = useCartStore((s) => s.addItem);
  const { notify } = useNotification();

  useEffect(() => {
    setAccountEmail((localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "").trim());
  }, []);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setOrder(null);
      setLoadError(t("accountOrder.invalidId"));
      setIsLoading(false);
      return;
    }

    const loggedInEmail = localStorage.getItem(AUTH_EMAIL_STORAGE_KEY) ?? "";
    const backendBaseUrl = getBackendBaseUrl();
    const controller = new AbortController();

    const loadOrder = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/orders/${orderId}?email=${encodeURIComponent(loggedInEmail)}`,
          { credentials: "include", signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: OrderDetails;
        };
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error(payload.message ?? t("accountOrder.loadFailed"));
        }
        setOrder(payload.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setOrder(null);
        setLoadError(error instanceof Error ? error.message : t("accountOrder.loadFailed"));
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      }
    };

    void loadOrder();
    return () => controller.abort();
  }, [orderId, t]);

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
        type: "info",
        message: t("accountOrder.noItems"),
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
      message: t("accountOrder.addedToCart").replace("{{count}}", String(displayItems.length)),
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
            {t("accountOrder.breadcrumbHome")}
          </Link>
          <span className="mx-2">→</span>
          <Link href="/account" className="hover:underline">
            {t("accountOrder.breadcrumbAccount")}
          </Link>
          <span className="mx-2">→</span>
          <span className="font-semibold text-gray-700">
            {order
              ? `${t("accountOrder.orderNumber")} ${order.orderNumber}`
              : `${t("accountOrder.orderNumber")} #${orderId}`}
          </span>
        </div>
      </section>

      <section className="w-full px-4 py-8 sm:px-6 lg:px-20">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 rounded-lg bg-my-red px-6 py-6">
          <FaBoxOpen className="h-10 w-10 shrink-0 text-white sm:h-12 sm:w-12" />
          <h1 className="text-2xl font-bold uppercase tracking-wide text-white sm:text-3xl lg:text-4xl">
            {t("accountOrder.title")}
          </h1>
        </div>
      </section>

      <section className="w-full px-4 pb-12 sm:px-6 lg:px-20">
        <div className="mx-auto max-w-6xl rounded-lg border border-gray-200 bg-white p-6 sm:p-8">
          {isLoading ? (
            <p className="text-sm text-gray-600">{t("accountOrder.loading")}</p>
          ) : loadError ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-700">{loadError}</p>
              <Link href="/account" className="text-sm font-semibold text-my-red hover:underline">
                {t("accountOrder.backToAccount")}
              </Link>
            </div>
          ) : !order ? (
            <div className="space-y-4">
              <p className="text-sm font-medium text-red-700">
                {t("accountOrder.notFound")}
              </p>
              <Link href="/account" className="text-sm font-semibold text-my-red hover:underline">
                {t("accountOrder.backToAccount")}
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  {t("accountOrder.orderNumber")} #{order.orderNumber}
                </h2>
                <p className="mt-1 text-sm text-gray-600">
                  {t("accountOrder.date")}: {new Date(order.createdAt).toLocaleString()}
                </p>
                <button
                  type="button"
                  onClick={handleReorder}
                  disabled={!hasDisplayItems}
                  className="mt-3 inline-flex items-center rounded-md bg-my-red px-4 py-2 text-sm font-semibold text-white transition hover:bg-my-red/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {t("accountOrder.addToCart")}
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-lg border border-gray-200 p-4 sm:grid-cols-4">
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    {t("accountOrder.orderNumber")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-800">{order.orderNumber}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    {t("accountOrder.date")}
                  </p>
                  <p className="mt-1 text-sm font-medium text-gray-800">
                    {new Date(order.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase text-gray-500">
                    {t("accountOrder.status")}
                  </p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusBadgeClass(order.status)}`}
                  >
                    {order.status.toUpperCase()}
                  </span>
                </div>
                {order.paymentStatus ? (
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      {t("accountOrder.payment")}
                    </p>
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
                    {t("accountOrder.items")} ({displayItems.length})
                  </h3>
                  <div className="mt-4 space-y-3">
                    {displayItems.map((item) => {
                      const imageSrc = item.imageUrl ?? FALLBACK_PRODUCT_IMAGE;
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
                              {item.quantity} × {formatCurrency(item.unitPrice)}
                            </p>
                          </div>
                          <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                            <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                              {t("accountOrder.total")}
                            </p>
                            <p className="text-base font-bold text-gray-900">
                              {formatCurrency(item.lineTotal)}
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
                    {t("accountOrder.items")}
                  </h3>
                  <div className="mt-3 space-y-3 text-sm text-gray-700">
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span>{order.boxTypeName}</span>
                      <span className="font-medium">
                        {t("accountOrder.quantity")}: {order.quantity} {t("accountOrder.pcs")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                      <span>
                        {t("accountOrder.cardboardColour")}: {order.cardboardType}
                      </span>
                      <span className="font-medium">{order.cardboardColour}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>{t("accountOrder.boxPrint")}</span>
                      <span className="font-medium">{order.boxPrint}</span>
                    </div>
                  </div>
                </div>
              )}

              {order.priceBreakdown ? (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    {t("accountOrder.orderTotal")}
                  </h3>
                  <div className="mt-4 space-y-2 text-sm text-gray-700">
                    <div className="flex items-center justify-between">
                      <span>{t("accountOrder.subtotal")}</span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(order.priceBreakdown.subtotal)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>
                        {t("accountOrder.vat")}
                        {order.priceBreakdown.vatPercent != null
                          ? ` (${order.priceBreakdown.vatPercent}%)`
                          : ""}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(order.priceBreakdown.vatAmount)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>
                        {t("accountOrder.shipping")}
                        {order.priceBreakdown.shippingMethod
                          ? ` (${order.priceBreakdown.shippingMethod}${
                              order.priceBreakdown.shippingEta
                                ? ` · ${order.priceBreakdown.shippingEta}`
                                : ""
                            })`
                          : ""}
                      </span>
                      <span className="font-medium text-gray-900">
                        {formatCurrency(order.priceBreakdown.shipping)}
                      </span>
                    </div>
                    <div className="mt-2 flex items-center justify-between border-t border-gray-200 pt-3">
                      <span className="text-sm font-bold uppercase tracking-wide text-gray-800">
                        {t("accountOrder.total")}
                      </span>
                      <span className="text-base font-bold text-my-red">
                        {formatCurrency(order.priceBreakdown.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    {t("accountOrder.shippingAddress")}
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
                      {t("accountOrder.orderMetadata")}
                    </h3>
                    <div className="mt-3 space-y-2 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>{t("accountOrder.transport")}</span>
                        <span>{order.transport}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>{t("accountOrder.size")}</span>
                        <span>{order.size}</span>
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="rounded-lg border border-gray-200 p-4">
                <OrderAttachmentActions
                  orderId={order.id}
                  attachmentName={order.attachmentName}
                  hasAttachment={order.hasAttachment}
                  ownerEmail={accountEmail}
                  label={t("attachment.label")}
                  openText={t("attachment.open")}
                  downloadText={t("attachment.download")}
                />
              </div>

              {cleanCustomerMessage.trim().length > 0 ? (
                <div className="rounded-lg border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    {t("accountOrder.customerMessage")}
                  </h3>
                  <div className="mt-3 whitespace-pre-line text-sm text-gray-700">
                    {cleanCustomerMessage}
                  </div>
                </div>
              ) : null}

              <Link href="/account" className="text-sm font-semibold text-my-red hover:underline">
                {t("accountOrder.backToAccount")}
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
