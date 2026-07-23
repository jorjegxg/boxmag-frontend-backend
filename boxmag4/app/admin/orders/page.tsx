"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUS_OPTIONS,
  formatOfferStatus,
  formatPaymentStatus,
  offerBadgeClass,
  orderNeedsManualOfferResponse,
  paymentBadgeClass,
  type OrderStatusValue,
} from "../admin-ro";
import {
  type AdminOrder,
  getBackendBaseUrl,
} from "../components/admin-types";
import { AdminBreadcrumb, SectionTitle } from "../components/admin-ui";

const ORDERS_PAGE_SIZE = 10;

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(true);
  const [ordersError, setOrdersError] = useState<string | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [ordersPage, setOrdersPage] = useState(1);

  const backendBaseUrl = useMemo(() => getBackendBaseUrl(), []);

  useEffect(() => {
    const loadOrders = async () => {
      setIsLoadingOrders(true);
      setOrdersError(null);
      try {
        const response = await fetch(`${backendBaseUrl}/api/orders`, {
          credentials: "include",
        });
        const payload = (await response.json()) as {
          ok?: boolean;
          data?: AdminOrder[];
          message?: string;
        };
        if (
          !response.ok ||
          payload.ok !== true ||
          !Array.isArray(payload.data)
        ) {
          throw new Error(
            payload.message ?? `Failed with status ${response.status}`,
          );
        }
        setOrders(payload.data);
        setOrdersPage(1);
      } catch (error) {
        setOrdersError(
          error instanceof Error
            ? error.message
            : "Nu s-au putut încărca comenzile",
        );
      } finally {
        setIsLoadingOrders(false);
      }
    };

    void loadOrders();
  }, [backendBaseUrl]);

  const handleOrderStatusChange = async (
    orderId: number,
    nextStatus: OrderStatusValue,
  ) => {
    setUpdatingOrderId(orderId);
    try {
      const response = await fetch(
        `${backendBaseUrl}/api/orders/${orderId}/status`,
        {
          method: "PATCH",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
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

      setOrders((prev) =>
        prev.map((order) =>
          order.id === orderId ? { ...order, status: nextStatus } : order,
        ),
      );
    } catch (error) {
      setOrdersError(
        error instanceof Error
          ? error.message
          : "Nu s-a putut actualiza statusul comenzii",
      );
    } finally {
      setUpdatingOrderId(null);
    }
  };

  const totalOrdersPages = Math.max(
    1,
    Math.ceil(orders.length / ORDERS_PAGE_SIZE),
  );
  const safeOrdersPage = Math.min(ordersPage, totalOrdersPages);
  const paginatedOrders = orders.slice(
    (safeOrdersPage - 1) * ORDERS_PAGE_SIZE,
    safeOrdersPage * ORDERS_PAGE_SIZE,
  );

  return (
    <div>
      <AdminBreadcrumb current="Comenzi" />

      <section className="w-full bg-white px-6 lg:px-20 py-8">
        <div className="max-w-7xl mx-auto rounded-[28px] border border-black/15 bg-white overflow-hidden">
          <SectionTitle
            title="Comenzi"
            subtitle="Date încărcate din comenzi și contacte"
          />

          <div className="p-6 lg:p-8 space-y-6">
            <div className="rounded-xl border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-my-light-gray2 text-gray-800">
                    <tr>
                      <th className="px-4 py-3 text-left font-semibold">
                        ID comandă
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Client
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Companie
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Tip cutie
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Cantitate
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Răspuns
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Plată Stripe
                      </th>
                      <th className="px-4 py-3 text-left font-semibold">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoadingOrders ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={8}>
                          Se încarcă comenzile...
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingOrders && ordersError ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-red-600" colSpan={8}>
                          Eroare la încărcarea comenzilor: {ordersError}
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingOrders && !ordersError && orders.length === 0 ? (
                      <tr className="border-t border-gray-200">
                        <td className="px-4 py-3 text-gray-500" colSpan={8}>
                          Nu există comenzi.
                        </td>
                      </tr>
                    ) : null}
                    {!isLoadingOrders && !ordersError
                      ? paginatedOrders.map((order) => (
                          <tr
                            key={order.id}
                            className="border-t border-gray-200 cursor-pointer transition-colors hover:bg-gray-50"
                            onClick={() =>
                              router.push(`/admin/orders/${order.id}`)
                            }
                          >
                            <td className="px-4 py-3 font-medium text-my-red">
                              {order.orderNumber}
                            </td>
                            <td className="px-4 py-3">{order.customerName}</td>
                            <td className="px-4 py-3">{order.companyName}</td>
                            <td className="px-4 py-3">{order.boxTypeName}</td>
                            <td className="px-4 py-3">{order.quantity}</td>
                            <td className="px-4 py-3">
                              {orderNeedsManualOfferResponse(order) ? (
                                <span
                                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold ${offerBadgeClass(order.offerSentAt)}`}
                                >
                                  {formatOfferStatus(order.offerSentAt)}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              {order.stripeSessionId && order.paymentStatus ? (
                                <span
                                  className={`inline-block rounded-full px-2.5 py-1 text-xs font-bold uppercase ${paymentBadgeClass(order.paymentStatus)}`}
                                >
                                  {formatPaymentStatus(order.paymentStatus)}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td
                              className="px-4 py-3"
                              onClick={(event) => event.stopPropagation()}
                            >
                              <OrderStatusControl
                                orderId={order.id}
                                status={order.status}
                                disabled={updatingOrderId === order.id}
                                onChange={handleOrderStatusChange}
                              />
                            </td>
                          </tr>
                        ))
                      : null}
                  </tbody>
                </table>
              </div>
            </div>
            {!isLoadingOrders && !ordersError && orders.length > 0 ? (
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <span className="text-sm text-gray-600">
                  Afișare{" "}
                  <span className="font-semibold">
                    {(safeOrdersPage - 1) * ORDERS_PAGE_SIZE + 1}
                  </span>
                  {"–"}
                  <span className="font-semibold">
                    {Math.min(safeOrdersPage * ORDERS_PAGE_SIZE, orders.length)}
                  </span>{" "}
                  din <span className="font-semibold">{orders.length}</span>{" "}
                  comenzi
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setOrdersPage((prev) => Math.max(1, prev - 1))
                    }
                    disabled={safeOrdersPage <= 1}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Înapoi
                  </button>
                  <span className="text-sm text-gray-600">
                    Pagina{" "}
                    <span className="font-semibold">{safeOrdersPage}</span> din{" "}
                    <span className="font-semibold">{totalOrdersPages}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setOrdersPage((prev) =>
                        Math.min(totalOrdersPages, prev + 1),
                      )
                    }
                    disabled={safeOrdersPage >= totalOrdersPages}
                    className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Înainte
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </section>
    </div>
  );
}

function OrderStatusControl({
  orderId,
  status,
  disabled,
  onChange,
}: {
  orderId: number;
  status: string;
  disabled: boolean;
  onChange: (orderId: number, nextStatus: OrderStatusValue) => Promise<void>;
}) {
  const normalizedStatus = status.toLowerCase();
  const selectedStatus = ORDER_STATUS_OPTIONS.includes(
    normalizedStatus as OrderStatusValue,
  )
    ? (normalizedStatus as OrderStatusValue)
    : "new";

  return (
    <select
      value={selectedStatus}
      disabled={disabled}
      onChange={(event) =>
        void onChange(orderId, event.target.value as OrderStatusValue)
      }
      className="h-8 rounded-md border border-gray-300 bg-white px-2 text-xs text-gray-900 focus:outline-none focus:ring-2 focus:ring-my-red focus:border-my-red disabled:bg-gray-100 disabled:text-gray-500"
    >
      {ORDER_STATUS_OPTIONS.map((option) => (
        <option key={option} value={option}>
          {ORDER_STATUS_LABELS[option]}
        </option>
      ))}
    </select>
  );
}
