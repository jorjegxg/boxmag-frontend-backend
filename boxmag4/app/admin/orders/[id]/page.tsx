"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { OrderAttachmentActions } from "../../../global/components/order-attachment-actions";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  PAYMENT_STATUS_OPTIONS,
  formatAdminDate,
  formatOrderStatus,
  formatPaymentStatus,
  type OrderStatusValue,
  type PaymentStatusValue,
} from "../../admin-ro";

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
  stripeSessionId: string | null;
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
  offerSentAt: string | null;
  offerSentFrom: string | null;
};

type OfferSenderOption = {
  key: "info" | "b2b" | "orders";
  email: string;
  label: string;
};

const FALLBACK_PRODUCT_IMAGE = "/b2b/boxes/box.png";
const DEFAULT_OFFER_MESSAGE =
  "Va transmitem oferta pentru cererea dumneavoastra. Mai jos regasiti detaliile comenzii.";

function isLikelyDemoCustomerEmail(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  return (
    normalized.includes("customer.demo@") ||
    normalized.endsWith("@example.com") ||
    normalized.endsWith("@test.com")
  );
}

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
    const lineTotal = lineMatch
      ? Number(lineMatch[1])
      : +(quantity * unitPrice).toFixed(2);

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

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
        {label}
      </p>
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
  const [isUpdatingPaymentStatus, setIsUpdatingPaymentStatus] = useState(false);
  const [paymentStatusError, setPaymentStatusError] = useState<string | null>(
    null,
  );
  const [offerSenders, setOfferSenders] = useState<OfferSenderOption[]>([]);
  const [selectedSenderKey, setSelectedSenderKey] = useState<
    OfferSenderOption["key"] | ""
  >("");
  const [offerMessage, setOfferMessage] = useState(DEFAULT_OFFER_MESSAGE);
  const [isSendingOffer, setIsSendingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);

  const backendBaseUrl = useMemo(() => {
    const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
    if (!value) return "http://localhost:3005";
    return value.endsWith("/") ? value.slice(0, -1) : value;
  }, []);

  useEffect(() => {
    if (!Number.isInteger(orderId) || orderId <= 0) {
      setOrder(null);
      setLoadError("ID comandă invalid.");
      setIsLoading(false);
      return;
    }

    const controller = new AbortController();
    const loadOrder = async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/orders/${orderId}`,
          {
            credentials: "include",
            signal: controller.signal,
          },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          message?: string;
          data?: AdminOrderDetails;
        };
        if (!response.ok || payload.ok !== true || !payload.data) {
          throw new Error(payload.message ?? "Nu s-au putut încărca detaliile comenzii");
        }
        setOrder(payload.data);
      } catch (error) {
        if (controller.signal.aborted) return;
        setOrder(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "Nu s-au putut încărca detaliile comenzii",
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

  useEffect(() => {
    const controller = new AbortController();
    const loadOfferSenders = async () => {
      try {
        const response = await fetch(
          `${backendBaseUrl}/api/orders/offer-senders`,
          { credentials: "include", signal: controller.signal },
        );
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: OfferSenderOption[];
          defaultKey?: OfferSenderOption["key"];
        };
        if (!response.ok || payload.ok !== true || !Array.isArray(payload.data)) {
          return;
        }
        setOfferSenders(payload.data);
        setSelectedSenderKey((current) => {
          if (current) return current;
          const defaultKey = payload.defaultKey;
          if (
            defaultKey &&
            payload.data?.some((sender) => sender.key === defaultKey)
          ) {
            return defaultKey;
          }
          return payload.data?.[0]?.key ?? "";
        });
      } catch (error) {
        if (controller.signal.aborted) return;
        setOfferSenders([]);
      }
    };

    void loadOfferSenders();
    return () => controller.abort();
  }, [backendBaseUrl]);

  const isCartOrder = useMemo(
    () => Array.isArray(order?.items) && (order?.items?.length ?? 0) > 0,
    [order],
  );

  const parsedMessageItems = useMemo(
    () => (order?.message ? parseStripeMessageItems(order.message) : []),
    [order?.message],
  );

  const displayItems = useMemo(
    () => (isCartOrder ? (order?.items ?? []) : parsedMessageItems),
    [isCartOrder, order?.items, parsedMessageItems],
  );

  const hasDisplayItems = displayItems.length > 0;

  const showOfferEmail = useMemo(() => {
    if (!order) return false;
    const isPaid = order.paymentStatus?.trim().toLowerCase() === "paid";
    return !(isCartOrder && isPaid);
  }, [order, isCartOrder]);

  const cleanCustomerMessage = useMemo(() => {
    if (!order?.message) return "";
    if (!hasDisplayItems) return order.message;
    if (order.message.startsWith("Stripe checkout cart order")) return "";
    return order.message;
  }, [order, hasDisplayItems]);

  const handleSendOffer = async () => {
    if (!order || !selectedSenderKey) return;
    setIsSendingOffer(true);
    setOfferError(null);
    setOfferSuccess(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/orders/${order.id}/send-offer`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fromKey: selectedSenderKey,
            message: offerMessage,
          }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
        data?: {
          to?: string;
          from?: string | null;
          offerSentAt?: string | null;
          offerSentFrom?: string | null;
        };
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(payload.message ?? "Nu s-a putut trimite emailul cu ofertă");
      }
      const sentAt = payload.data?.offerSentAt ?? new Date().toISOString();
      const sentFrom = payload.data?.offerSentFrom ?? payload.data?.from ?? null;
      setOrder((current) =>
        current
          ? {
              ...current,
              offerSentAt: sentAt,
              offerSentFrom: sentFrom,
            }
          : current,
      );
      setOfferSuccess(
        `Ofertă trimisă către ${payload.data?.to ?? order.email}${
          sentFrom ? ` de la ${sentFrom}` : ""
        }.`,
      );
    } catch (error) {
      setOfferError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut trimite emailul cu ofertă",
      );
    } finally {
      setIsSendingOffer(false);
    }
  };

  const handlePaymentStatusChange = async (nextStatus: PaymentStatusValue) => {
    if (!order) return;
    setIsUpdatingPaymentStatus(true);
    setPaymentStatusError(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/orders/${order.id}/payment-status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus: nextStatus }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }
      setOrder((prev) =>
        prev ? { ...prev, paymentStatus: nextStatus } : prev,
      );
    } catch (error) {
      setPaymentStatusError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut actualiza statusul plății",
      );
    } finally {
      setIsUpdatingPaymentStatus(false);
    }
  };

  const handleStatusChange = async (nextStatus: OrderStatusValue) => {
    if (!order) return;
    setIsUpdatingStatus(true);
    setStatusError(null);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/orders/${order.id}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        },
      );
      const payload = (await response.json()) as {
        ok?: boolean;
        message?: string;
      };
      if (!response.ok || payload.ok !== true) {
        throw new Error(
          payload.message ?? `Failed with status ${response.status}`,
        );
      }
      setOrder((prev) => (prev ? { ...prev, status: nextStatus } : prev));
    } catch (error) {
      setStatusError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut actualiza statusul comenzii",
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

  const isStripeOrder = Boolean(order?.stripeSessionId?.trim());
  const selectedPaymentStatus = PAYMENT_STATUS_OPTIONS.includes(
    (order?.paymentStatus ?? "").toLowerCase() as PaymentStatusValue,
  )
    ? ((order?.paymentStatus ?? "").toLowerCase() as PaymentStatusValue)
    : "pending";

  return (
    <div>
      <section className="w-full bg-white px-6 pt-6 lg:px-20">
        <div className="mx-auto max-w-7xl text-xs uppercase tracking-wide text-gray-500 lg:text-sm">
          <Link href="/" className="hover:underline">
            Acasă
          </Link>
          <span className="mx-2">→</span>
          <Link href="/admin" className="hover:underline">
            Admin
          </Link>
          <span className="mx-2">→</span>
          <span className="font-semibold text-gray-700">
            {order ? order.orderNumber : `Comanda #${orderId}`}
          </span>
        </div>
      </section>

      <section className="w-full bg-white px-6 py-8 lg:px-20">
        <div className="mx-auto max-w-7xl overflow-hidden rounded-[28px] border border-black/15 bg-white">
          <div className="border-b border-gray-200 px-6 py-5 lg:px-8">
            <h1 className="text-2xl font-bold text-gray-900">Detalii comandă</h1>
            <p className="mt-1 text-sm text-gray-600">
              Informații complete despre comandă
            </p>
          </div>

          <div className="space-y-6 p-6 lg:p-8">
            {isLoading ? (
              <p className="text-sm text-gray-600">Se încarcă detaliile comenzii...</p>
            ) : loadError ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-700">{loadError}</p>
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-my-red hover:underline"
                >
                  Înapoi la admin
                </Link>
              </div>
            ) : !order ? (
              <div className="space-y-4">
                <p className="text-sm font-medium text-red-700">
                  Comanda nu a fost găsită.
                </p>
                <Link
                  href="/admin"
                  className="text-sm font-semibold text-my-red hover:underline"
                >
                  Înapoi la admin
                </Link>
              </div>
            ) : (
              <>
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">
                      {order.orderNumber}
                    </h2>
                    <p className="mt-1 text-sm text-gray-600">
                      Plasată pe {formatAdminDate(order.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push("/admin")}
                    className="inline-flex h-9 items-center rounded-md border border-gray-300 px-4 text-sm font-semibold text-gray-800 hover:bg-gray-50"
                  >
                    Înapoi la lista de comenzi
                  </button>
                </div>

                <div className="grid grid-cols-1 gap-4 rounded-xl border border-gray-200 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Schimbă status
                    </p>
                    <select
                      value={selectedStatus}
                      disabled={isUpdatingStatus}
                      onChange={(event) =>
                        void handleStatusChange(
                          event.target.value as OrderStatusValue,
                        )
                      }
                      className="mt-2 h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
                    >
                      {ORDER_STATUS_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {ORDER_STATUS_LABELS[option]}
                        </option>
                      ))}
                    </select>
                    {statusError ? (
                      <p className="mt-1 text-xs text-red-600">{statusError}</p>
                    ) : null}
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-gray-500">
                      Status curent
                    </p>
                    <span
                      className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${statusBadgeClass(order.status)}`}
                    >
                      {formatOrderStatus(order.status)}
                    </span>
                  </div>
                  {order.paymentStatus || !isStripeOrder ? (
                    <div>
                      <p className="text-xs font-semibold uppercase text-gray-500">
                        {isStripeOrder ? "Plată Stripe" : "Schimbă status plată"}
                      </p>
                      {isStripeOrder ? (
                        <span
                          className={`mt-2 inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${paymentBadgeClass(order.paymentStatus ?? "pending")}`}
                        >
                          {formatPaymentStatus(order.paymentStatus ?? "pending")}
                        </span>
                      ) : (
                        <>
                          <select
                            value={selectedPaymentStatus}
                            disabled={isUpdatingPaymentStatus}
                            onChange={(event) =>
                              void handlePaymentStatusChange(
                                event.target.value as PaymentStatusValue,
                              )
                            }
                            className="mt-2 h-9 w-full rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
                          >
                            {PAYMENT_STATUS_OPTIONS.map((option) => (
                              <option key={option} value={option}>
                                {formatPaymentStatus(option)}
                              </option>
                            ))}
                          </select>
                          {paymentStatusError ? (
                            <p className="mt-1 text-xs text-red-600">
                              {paymentStatusError}
                            </p>
                          ) : null}
                        </>
                      )}
                    </div>
                  ) : null}
                  <DetailField
                    label="Cantitate totală"
                    value={String(order.quantity)}
                  />
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Client
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Nume" value={order.customerName} />
                    <DetailField label="Companie" value={order.companyName} />
                    <DetailField label="Email" value={order.email} />
                    <DetailField label="Telefon" value={order.phone} />
                    <DetailField label="Oraș" value={order.city} />
                    <DetailField label="Țară" value={order.country} />
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                    Specificații produs
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <DetailField label="Tip cutie" value={order.boxTypeName} />
                    <DetailField
                      label="Tip carton"
                      value={order.cardboardType}
                    />
                    <DetailField
                      label="Culoare carton"
                      value={order.cardboardColour}
                    />
                    <DetailField label="Imprimare cutie" value={order.boxPrint} />
                    <DetailField label="Dimensiune" value={order.size} />
                    <DetailField label="Transport" value={order.transport} />
                    <OrderAttachmentActions
                      orderId={order.id}
                      attachmentName={order.attachmentName}
                      hasAttachment={order.hasAttachment}
                      label="Atașament"
                      emptyText="Nu"
                      openText="Deschide atașamentul"
                      downloadText="Descarcă"
                    />
                  </div>
                </div>

                {hasDisplayItems ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Produse ({displayItems.length})
                    </h3>
                    <div className="mt-4 space-y-3">
                      {displayItems.map((item) => {
                        const imageSrc =
                          item.imageUrl ?? FALLBACK_PRODUCT_IMAGE;
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
                              <p className="mt-1 text-sm font-bold text-gray-900">
                                {item.name}
                              </p>
                              <p className="mt-2 text-xs text-gray-600">
                                {item.quantity} ×{" "}
                                {formatCurrency(item.unitPrice)}
                              </p>
                            </div>
                            <div className="flex flex-row items-center justify-between gap-4 sm:flex-col sm:items-end sm:gap-1">
                              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                Total linie
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
                ) : null}

                {order.priceBreakdown ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Total comandă
                    </h3>
                    <div className="mt-4 space-y-2 text-sm text-gray-700">
                      <div className="flex items-center justify-between">
                        <span>Subtotal</span>
                        <span className="font-medium text-gray-900">
                          {formatCurrency(order.priceBreakdown.subtotal)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>
                          TVA
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
                          Livrare
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
                          Total
                        </span>
                        <span className="text-base font-bold text-my-red">
                          {formatCurrency(order.priceBreakdown.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : null}

                {cleanCustomerMessage.trim().length > 0 ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Mesaj client
                    </h3>
                    <div className="mt-3 whitespace-pre-line text-sm text-gray-700">
                      {cleanCustomerMessage}
                    </div>
                  </div>
                ) : null}

                {showOfferEmail ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="text-sm font-bold uppercase tracking-wide text-gray-800">
                      Trimite email cu ofertă
                    </h3>
                    <p className="mt-2 text-sm text-gray-600">
                      Trimite un email cu ofertă către{" "}
                      <span className="font-semibold text-gray-900">
                        {order.email || "—"}
                      </span>
                      , cu detaliile comenzii incluse.
                    </p>
                    {order.email && isLikelyDemoCustomerEmail(order.email) ? (
                      <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                        Această comandă folosește o adresă de test (
                        <span className="font-semibold">{order.email}</span>
                        ). Emailul se trimite la această adresă, nu la un inbox
                        personal. Pentru testare reală, plasează o comandă cu
                        emailul clientului sau actualizează adresa în baza de
                        date.
                      </p>
                    ) : null}

                    {order.offerSentAt ? (
                      <div
                        role="status"
                        className="mt-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800"
                      >
                        <p className="font-semibold">Ofertă deja trimisă</p>
                        <p className="mt-1">
                          Trimisă pe {formatAdminDate(order.offerSentAt)}
                          {order.offerSentFrom
                            ? ` de la ${order.offerSentFrom}`
                            : ""}{" "}
                          către {order.email || "—"}.
                        </p>
                      </div>
                    ) : null}

                    {offerSenders.length === 0 ? (
                      <p className="mt-4 text-sm text-amber-700">
                        Nu există adrese expeditor configurate. Setează SMTP și
                        variabilele de email în `.env`.
                      </p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        <div>
                          <label
                            htmlFor="offer-sender"
                            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            Trimite de la
                          </label>
                          <select
                            id="offer-sender"
                            value={selectedSenderKey}
                            disabled={isSendingOffer}
                            onChange={(event) =>
                              setSelectedSenderKey(
                                event.target.value as OfferSenderOption["key"],
                              )
                            }
                            className="mt-2 h-10 w-full rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
                          >
                            {offerSenders.map((sender) => (
                              <option key={sender.key} value={sender.key}>
                                {sender.label} ({sender.email})
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label
                            htmlFor="offer-message"
                            className="text-xs font-semibold uppercase tracking-wide text-gray-500"
                          >
                            Mesaj
                          </label>
                          <textarea
                            id="offer-message"
                            rows={5}
                            value={offerMessage}
                            disabled={isSendingOffer}
                            onChange={(event) =>
                              setOfferMessage(event.target.value)
                            }
                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-my-red focus:outline-none focus:ring-2 focus:ring-my-red disabled:bg-gray-100"
                          />
                        </div>

                        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                          <button
                            type="button"
                            disabled={
                              isSendingOffer ||
                              !selectedSenderKey ||
                              !order.email.trim()
                            }
                            onClick={() => void handleSendOffer()}
                            className="inline-flex h-10 items-center justify-center rounded-md bg-my-red px-5 text-sm font-semibold text-white hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            {isSendingOffer
                              ? "Se trimite..."
                              : order.offerSentAt
                                ? "Retrimite email cu ofertă"
                                : "Trimite email cu ofertă"}
                          </button>
                          {offerSuccess ? (
                            <p className="text-sm font-medium text-green-700">
                              {offerSuccess}
                            </p>
                          ) : null}
                          {offerError ? (
                            <p className="text-sm font-medium text-red-700">
                              {offerError}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    )}
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
