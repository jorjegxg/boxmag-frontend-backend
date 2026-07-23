export type AdminOrder = {
  id: number;
  orderNumber: string;
  customerName: string;
  companyName: string;
  boxTypeName: string;
  cardboardType: string;
  cardboardColour: string;
  boxPrint: string;
  size: string;
  transport: string;
  quantity: number;
  attachmentName: string | null;
  message: string;
  status: string;
  paymentStatus: string | null;
  stripeSessionId: string | null;
  offerSentAt: string | null;
  offerSentFrom: string | null;
  email: string;
  phone: string;
  city: string;
  country: string;
  createdAt: string;
};

export type AdminShippingMethod = {
  id: number;
  key: string;
  name: string;
  etaText: string;
  price: number;
  isActive: boolean;
  sortOrder: number;
};

export function getBackendBaseUrl(): string {
  const value = process.env.NEXT_PUBLIC_BACKEND_URL?.trim();
  if (!value) return "http://localhost:3005";
  return value.endsWith("/") ? value.slice(0, -1) : value;
}
