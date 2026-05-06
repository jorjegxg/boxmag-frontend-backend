export type AccountOrder = {
  date: string;
  orderNumber: string;
  status: "PROCESSING" | "SHIPPED" | "COMPLETED";
};

export const accountSampleOrders: AccountOrder[] = [
  { date: "16-Apr-2024", orderNumber: "12912312", status: "PROCESSING" },
  { date: "12-Apr-2024", orderNumber: "12912280", status: "PROCESSING" },
  { date: "10-Apr-2024", orderNumber: "12912240", status: "PROCESSING" },
  { date: "07-Apr-2024", orderNumber: "12912199", status: "SHIPPED" },
  { date: "04-Feb-2024", orderNumber: "12912140", status: "COMPLETED" },
  { date: "01-Jan-2024", orderNumber: "12912101", status: "COMPLETED" },
];
