export type OrderStatusValue = "new" | "in progress" | "completed" | "done";

export const ORDER_STATUS_OPTIONS: OrderStatusValue[] = [
  "new",
  "in progress",
  "completed",
  "done",
];

export const ORDER_STATUS_LABELS: Record<OrderStatusValue, string> = {
  new: "Nouă",
  "in progress": "În lucru",
  completed: "Finalizată",
  done: "Încheiată",
};

const EXTRA_ORDER_STATUS_LABELS: Record<string, string> = {
  processing: "În procesare",
  shipped: "Expediată",
};

export function formatOrderStatus(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (ORDER_STATUS_OPTIONS.includes(normalized as OrderStatusValue)) {
    return ORDER_STATUS_LABELS[normalized as OrderStatusValue];
  }
  return EXTRA_ORDER_STATUS_LABELS[normalized] ?? status;
}

export function formatPaymentStatus(status: string): string {
  const labels: Record<string, string> = {
    paid: "Plătită",
    pending: "În așteptare",
    failed: "Eșuată",
  };
  return labels[status.trim().toLowerCase()] ?? status;
}

export type PaymentStatusValue = "pending" | "paid" | "failed";

export const PAYMENT_STATUS_OPTIONS: PaymentStatusValue[] = [
  "pending",
  "paid",
  "failed",
];

export function formatOfferStatus(offerSentAt: string | null): string {
  return offerSentAt ? "Răspuns trimis" : "Așteaptă răspuns";
}

export function orderNeedsManualOfferResponse(order: {
  stripeSessionId: string | null;
  paymentStatus: string | null;
}): boolean {
  const isStripePaid =
    Boolean(order.stripeSessionId?.trim()) &&
    order.paymentStatus?.trim().toLowerCase() === "paid";
  return !isStripePaid;
}

export function offerBadgeClass(offerSentAt: string | null): string {
  return offerSentAt
    ? "text-green-700 bg-green-50"
    : "text-amber-700 bg-amber-50";
}

export function paymentBadgeClass(status: string): string {
  const normalized = status.trim().toLowerCase();
  if (normalized === "paid") return "text-green-700 bg-green-50";
  if (normalized === "pending") return "text-yellow-700 bg-yellow-50";
  if (normalized === "failed") return "text-red-700 bg-red-50";
  return "text-gray-600 bg-gray-50";
}

export function formatAdminDate(value: string): string {
  return new Date(value).toLocaleString("ro-RO");
}
