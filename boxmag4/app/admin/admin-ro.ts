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
  done: "Finalizată",
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

export function formatAdminDate(value: string): string {
  return new Date(value).toLocaleString("ro-RO");
}
