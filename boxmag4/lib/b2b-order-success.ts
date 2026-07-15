export const B2B_ORDER_SUCCESS_STORAGE_KEY = "boxmag.b2b.orderSuccess";

export type B2bOrderSuccessPayload = {
  orderId: number;
  orderNumber: string;
  email: string;
  firstName: string;
  surname: string;
  companyName: string;
  vatNumber: string;
  phone: string;
  isGuest: boolean;
};

export function formatOrderNumber(orderId: number): string {
  return `ORD-${String(orderId).padStart(4, "0")}`;
}

export function readB2bOrderSuccessPayload(): B2bOrderSuccessPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(B2B_ORDER_SUCCESS_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<B2bOrderSuccessPayload>;
    if (
      typeof parsed.orderId !== "number" ||
      typeof parsed.orderNumber !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.isGuest !== "boolean"
    ) {
      return null;
    }
    return {
      orderId: parsed.orderId,
      orderNumber: parsed.orderNumber,
      email: parsed.email,
      firstName: parsed.firstName ?? "",
      surname: parsed.surname ?? "",
      companyName: parsed.companyName ?? "",
      vatNumber: parsed.vatNumber ?? "",
      phone: parsed.phone ?? "",
      isGuest: parsed.isGuest,
    };
  } catch {
    return null;
  }
}

export function writeB2bOrderSuccessPayload(payload: B2bOrderSuccessPayload): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(B2B_ORDER_SUCCESS_STORAGE_KEY, JSON.stringify(payload));
}

export function clearB2bOrderSuccessPayload(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(B2B_ORDER_SUCCESS_STORAGE_KEY);
}

export function buildRegistrationUrlFromOrderSuccess(
  payload: B2bOrderSuccessPayload,
): string {
  const params = new URLSearchParams();
  params.set("email", payload.email);
  if (payload.firstName) params.set("firstName", payload.firstName);
  if (payload.surname) params.set("surname", payload.surname);
  if (payload.companyName) params.set("companyName", payload.companyName);
  if (payload.vatNumber) params.set("vatNumber", payload.vatNumber);
  if (payload.phone) params.set("phone", payload.phone);
  params.set("returnTo", "/account#orders");
  params.set("from", "b2b-order");
  return `/registration?${params.toString()}`;
}
